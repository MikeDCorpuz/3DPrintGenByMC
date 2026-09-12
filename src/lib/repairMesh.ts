import { BufferAttribute, BufferGeometry } from "three";
import Module from "manifold-3d";
import type { Manifold, Mesh } from "manifold-3d";
import wasmUrl from "manifold-3d/manifold.wasm?url";

type ManifoldApi = {
  Manifold: typeof Manifold;
  Mesh: typeof Mesh;
  setup: () => void;
};

let api: ManifoldApi | null = null;
let loading: Promise<ManifoldApi> | null = null;

async function getApi(): Promise<ManifoldApi> {
  if (api) return api;
  if (!loading) {
    loading = (async () => {
      const wasm = await Module({ locateFile: () => wasmUrl });
      wasm.setup();
      api = wasm as unknown as ManifoldApi;
      return api;
    })();
  }
  return loading;
}

function approxVolume(geometry: BufferGeometry): number {
  const pos = geometry.getAttribute("position");
  const idx = geometry.getIndex();
  if (!pos) return 0;
  let volume = 0;
  const triCount = idx ? idx.count / 3 : pos.count / 3;
  for (let i = 0; i < triCount; i++) {
    const i0 = idx ? idx.getX(i * 3) : i * 3;
    const i1 = idx ? idx.getX(i * 3 + 1) : i * 3 + 1;
    const i2 = idx ? idx.getX(i * 3 + 2) : i * 3 + 2;
    const ax = pos.getX(i0);
    const ay = pos.getY(i0);
    const az = pos.getZ(i0);
    const bx = pos.getX(i1);
    const by = pos.getY(i1);
    const bz = pos.getZ(i1);
    const cx = pos.getX(i2);
    const cy = pos.getY(i2);
    const cz = pos.getZ(i2);
    volume +=
      ax * (by * cz - bz * cy) +
      ay * (bz * cx - bx * cz) +
      az * (bx * cy - by * cx);
  }
  return Math.abs(volume) / 6;
}

function toIndexed(geometry: BufferGeometry): BufferGeometry {
  if (geometry.index) return geometry;
  const nonIndexed = geometry.toNonIndexed();
  const pos = nonIndexed.getAttribute("position");
  if (!pos) return nonIndexed;
  const map = new Map<string, number>();
  const verts: number[] = [];
  const indices: number[] = [];
  const keyOf = (i: number) =>
    `${pos.getX(i).toFixed(5)},${pos.getY(i).toFixed(5)},${pos.getZ(i).toFixed(5)}`;
  for (let i = 0; i < pos.count; i++) {
    const key = keyOf(i);
    let idx = map.get(key);
    if (idx == null) {
      idx = verts.length / 3;
      map.set(key, idx);
      verts.push(pos.getX(i), pos.getY(i), pos.getZ(i));
    }
    indices.push(idx);
  }
  const out = new BufferGeometry();
  out.setAttribute("position", new BufferAttribute(new Float32Array(verts), 3));
  out.setIndex(indices);
  if (nonIndexed !== geometry) nonIndexed.dispose();
  return out;
}

function geometryToManifold(
  ManifoldCtor: typeof Manifold,
  MeshCtor: typeof Mesh,
  geometry: BufferGeometry,
  tolerance: number,
): InstanceType<typeof Manifold> | null {
  const indexed = toIndexed(geometry);
  const pos = indexed.getAttribute("position");
  const idx = indexed.getIndex();
  if (!pos || !idx || idx.count < 3) {
    if (indexed !== geometry) indexed.dispose();
    return null;
  }

  const vertProperties = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    vertProperties[i * 3] = pos.getX(i);
    vertProperties[i * 3 + 1] = pos.getY(i);
    vertProperties[i * 3 + 2] = pos.getZ(i);
  }
  const triVerts = new Uint32Array(idx.count);
  for (let i = 0; i < idx.count; i++) triVerts[i] = idx.getX(i);
  if (indexed !== geometry) indexed.dispose();

  // Keep tolerance tight — larger values can collapse counters (A, e, o) or thin strokes.
  const mesh = new MeshCtor({
    numProp: 3,
    vertProperties,
    triVerts,
    tolerance,
  });
  mesh.merge();

  try {
    return ManifoldCtor.ofMesh(mesh);
  } catch {
    return null;
  }
}

function manifoldToGeometry(solid: InstanceType<typeof Manifold>): BufferGeometry {
  const mesh = solid.getMesh();
  const vertCount = mesh.numVert;
  const triCount = mesh.numTri;
  const positions = new Float32Array(vertCount * 3);
  for (let i = 0; i < vertCount; i++) {
    positions[i * 3] = mesh.vertProperties[i * mesh.numProp];
    positions[i * 3 + 1] = mesh.vertProperties[i * mesh.numProp + 1];
    positions[i * 3 + 2] = mesh.vertProperties[i * mesh.numProp + 2];
  }
  const indices = new Uint32Array(triCount * 3);
  for (let i = 0; i < triCount * 3; i++) indices[i] = mesh.triVerts[i];

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  geometry.setIndex(new BufferAttribute(indices, 1));
  geometry.computeVertexNormals();
  return geometry;
}

/** Left-to-right cord tunnel. Constant round section the whole way through. */
export async function subtractCordHole(
  geometry: BufferGeometry,
  holeR: number,
  span: number,
  centerZ: number,
): Promise<BufferGeometry> {
  const radius = Math.max(1.2, holeR);
  const length = Math.max(span + 8, 12);
  try {
    const api = await getApi();
    const solid = geometryToManifold(api.Manifold, api.Mesh, geometry, 0.05);
    if (!solid) return geometry;

    const cutter = api.Manifold.cylinder(length, radius, radius, 36, true)
      .rotate(0, 90, 0)
      .translate(0, 0, centerZ);
    const cut = solid.subtract(cutter);
    cutter.delete();
    solid.delete();
    if (cut.isEmpty()) {
      cut.delete();
      return geometry;
    }
    const next = manifoldToGeometry(cut);
    cut.delete();
    if (!next.getAttribute("position")?.count) {
      next.dispose();
      return geometry;
    }
    const before = approxVolume(geometry);
    const after = approxVolume(next);
    // An open letter like C can miss a short cutter. Keep the result only if the tunnel was actually removed.
    if (before > 1 && after > before - radius * radius * 4) {
      next.dispose();
      return geometry;
    }
    return next;
  } catch {
    return geometry;
  }
}

export interface RepairPiece {
  geometry: BufferGeometry;
  repaired: boolean;
  dispose: boolean;
  name?: string;
}

/**
 * Repair one mesh. If Manifold fails or the solid shrinks too much (e.g. lost
 * counter letter), keep the original geometry so letters like "A" are never dropped.
 */
export async function repairGeometry(
  geometry: BufferGeometry,
  tolerance = 0.02,
): Promise<RepairPiece> {
  const before = approxVolume(geometry);
  try {
    const { Manifold, Mesh } = await getApi();
    const solid = geometryToManifold(Manifold, Mesh, geometry, tolerance);
    if (!solid) return { geometry, repaired: false, dispose: false };
    if (solid.isEmpty()) {
      solid.delete();
      return { geometry, repaired: false, dispose: false };
    }
    const next = manifoldToGeometry(solid);
    solid.delete();
    const after = approxVolume(next);
    // Reject repairs that lose meaningful volume (dropped holes / thin glyphs).
    if (!next.getIndex()?.count || (before > 1 && after < before * 0.85)) {
      next.dispose();
      return { geometry, repaired: false, dispose: false };
    }
    return { geometry: next, repaired: true, dispose: true };
  } catch {
    return { geometry, repaired: false, dispose: false };
  }
}

/**
 * Repair each mesh on its own. Never union/drop letters — counters like "A"
 * often fail Manifold and must stay as the original extrusion.
 */
export async function repairGeometriesPreserveAll(
  pieces: { geometry: BufferGeometry; name: string }[],
  tolerance = 0.02,
): Promise<{ pieces: RepairPiece[]; repairedCount: number }> {
  const out: RepairPiece[] = [];
  let repairedCount = 0;
  for (const piece of pieces) {
    const result = await repairGeometry(piece.geometry, tolerance);
    out.push({ ...result, name: piece.name });
    if (result.repaired) repairedCount += 1;
  }
  return { pieces: out, repairedCount };
}
