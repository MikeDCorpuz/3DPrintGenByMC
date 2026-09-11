import JSZip from "jszip";
import type { BufferGeometry } from "three";
import type { BuiltBatch, KeychainParams, LayerId } from "../types";
import { isClickerProduct, isMonogramProduct, isNameplateProduct } from "../types";
import { repairGeometriesPreserveAll } from "./repairMesh";

const LAYER_ORDER: LayerId[] = ["housing", "outer", "outline", "name"];
const LAYER_LABEL: Record<LayerId, string> = {
  housing: "Switch housing",
  outer: "Outer plate",
  outline: "Inner outline",
  name: "Name",
};

function layerLabel(layer: LayerId, productType: KeychainParams["productType"]) {
  if (isMonogramProduct(productType)) {
    if (layer === "outer") return "Letter stand";
    if (layer === "outline") return "Letter rim";
    if (layer === "name") return "Script";
  }
  if (isNameplateProduct(productType)) {
    if (layer === "outer") return "Desk plate";
    if (layer === "outline") return "Plate frame";
    if (layer === "name") return "Name";
  }
  if (!isClickerProduct(productType)) return LAYER_LABEL[layer];
  if (layer === "outer") return "Keycap";
  if (layer === "outline") return "Cap outline";
  if (layer === "name") return "Letter";
  return LAYER_LABEL[layer];
}

interface Filament {
  layer: LayerId;
  name: string;
  hex: string;
  groupId: number;
}

function hexRgb(hex: string) {
  const clean = hex.replace("#", "").toUpperCase();
  return clean.length === 3
    ? clean.split("").map((c) => c + c).join("")
    : clean.slice(0, 6).padEnd(6, "0");
}

function colorAttr(hex: string) {
  return `#${hexRgb(hex)}FF`;
}

function usedFilaments(batch: BuiltBatch, params: KeychainParams): Filament[] {
  const used = new Set<LayerId>();
  for (const item of batch.items) {
    for (const part of item.keychain.parts) used.add(part.id);
  }
  let groupId = 2;
  return LAYER_ORDER.filter((layer) => used.has(layer)).map((layer) => {
    const filament = {
      layer,
      name: layerLabel(layer, params.productType),
      hex: params.colors[layer],
      groupId,
    };
    groupId += 2;
    return filament;
  });
}

function meshXml(geometry: BufferGeometry) {
  const indexed = geometry.index ? geometry : geometry.toNonIndexed();
  const pos = indexed.getAttribute("position");
  if (!pos) throw new Error("Mesh is missing positions.");

  const vertices: string[] = [];
  for (let i = 0; i < pos.count; i++) {
    vertices.push(
      `          <vertex x="${pos.getX(i).toFixed(4)}" y="${pos.getY(i).toFixed(4)}" z="${pos.getZ(i).toFixed(4)}" />`,
    );
  }

  const triangles: string[] = [];
  if (indexed.index) {
    const idx = indexed.index;
    for (let i = 0; i < idx.count; i += 3) {
      triangles.push(
        `          <triangle v1="${idx.getX(i)}" v2="${idx.getX(i + 1)}" v3="${idx.getX(i + 2)}" />`,
      );
    }
  } else {
    for (let i = 0; i < pos.count; i += 3) {
      triangles.push(`          <triangle v1="${i}" v2="${i + 1}" v3="${i + 2}" />`);
    }
  }

  return { vertices: vertices.join("\n"), triangles: triangles.join("\n") };
}

function transformAt(x: number, y: number) {
  return `1 0 0 0 1 0 0 0 1 ${x.toFixed(4)} ${y.toFixed(4)} 0`;
}

interface MeshObject {
  id: number;
  name: string;
  filament: Filament;
  vertices: string;
  triangles: string;
}

interface Assembly {
  id: number;
  name: string;
  x: number;
  y: number;
  parts: MeshObject[];
}

async function collectAssemblies(
  batch: BuiltBatch,
  filaments: Filament[],
  params: KeychainParams,
): Promise<{ assemblies: Assembly[]; nextId: number; repairedParts: number }> {
  const byLayer = new Map(filaments.map((f) => [f.layer, f]));
  const assemblies: Assembly[] = [];
  let nextId = filaments.length ? filaments[filaments.length - 1].groupId + 1 : 2;
  let repairedParts = 0;
  const disposable: BufferGeometry[] = [];

  for (const placed of batch.items) {
    const parts: MeshObject[] = [];
    for (const layer of LAYER_ORDER) {
      const filament = byLayer.get(layer);
      if (!filament) continue;
      const source = placed.keychain.parts.filter((part) => part.id === layer);
      if (!source.length) continue;

      // Repair each body alone — do not union the name layer. Union previously
      // dropped glyphs (e.g. "A") when Manifold could not solidify a counter.
      const { pieces, repairedCount } = await repairGeometriesPreserveAll(
        source.map((part) => ({ geometry: part.geometry, name: part.name })),
        0.02,
      );
      repairedParts += repairedCount;

      for (const piece of pieces) {
        if (piece.dispose) disposable.push(piece.geometry);
        const { vertices, triangles } = meshXml(piece.geometry);
        parts.push({
          id: nextId++,
          name: piece.name || layerLabel(layer, params.productType),
          filament,
          vertices,
          triangles,
        });
      }
    }
    if (!parts.length) continue;
    assemblies.push({
      id: nextId++,
      name: placed.label,
      x: placed.x,
      y: placed.y,
      parts,
    });
  }

  disposable.forEach((geo) => geo.dispose());
  return { assemblies, nextId, repairedParts };
}

function modelXml(
  batch: BuiltBatch,
  filaments: Filament[],
  assemblies: Assembly[],
  params: KeychainParams,
) {
  const groups = filaments
    .map(
      (f) =>
        `    <m:colorgroup id="${f.groupId}">
      <m:color name="${escapeXml(f.name)}" color="${colorAttr(f.hex)}" displaycolor="${colorAttr(f.hex)}" />
    </m:colorgroup>`,
    )
    .join("\n");

  const meshObjects = assemblies
    .flatMap((assembly) => assembly.parts)
    .map((part) => `    <object id="${part.id}" name="${escapeXml(part.name)}" type="model" pid="${part.filament.groupId}" pindex="0">
      <mesh>
        <vertices>
${part.vertices}
        </vertices>
        <triangles>
${part.triangles}
        </triangles>
      </mesh>
    </object>`)
    .join("\n");

  const assemblyObjects = assemblies
    .map((assembly) => {
      const components = assembly.parts
        .map((part) => `        <component objectid="${part.id}" />`)
        .join("\n");
      return `    <object id="${assembly.id}" name="${escapeXml(assembly.name)}" type="model">
      <components>
${components}
      </components>
    </object>`;
    })
    .join("\n");

  const items = assemblies
    .map((assembly) => `    <item objectid="${assembly.id}" transform="${transformAt(assembly.x, assembly.y)}" />`)
    .join("\n");

  const noun = isMonogramProduct(params.productType)
    ? "letter stand"
    : isNameplateProduct(params.productType)
      ? "name plate"
      : isClickerProduct(params.productType)
        ? "clicker"
        : "keychain";
  const title = batch.items.length === 1
    ? `${batch.items[0].label} ${noun}`
    : `${batch.items.length} ${noun}s`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xml:lang="en-US" requiredextensions="m"
  xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02"
  xmlns:m="http://schemas.microsoft.com/3dmanufacturing/material/2015/02">
  <metadata name="Application">Keychain Maker by Mike Corpuz</metadata>
  <metadata name="Title">${escapeXml(title)}</metadata>
  <metadata name="Designer">Mike Corpuz</metadata>
  <metadata name="Description">${
    isMonogramProduct(params.productType)
      ? "Multi-color letter stand with desk foot and script writing. Each layer is a separate color group for Bambu Studio AMS."
      : isNameplateProduct(params.productType)
        ? "Multi-color desk name plate with raised lettering. Each layer is a separate color group for Bambu Studio AMS."
        : isClickerProduct(params.productType)
          ? "Multi-color clicker housing and keycap. Each layer is a separate color group for Bambu Studio AMS."
          : "Multi-color name keychains. Each layer is a separate color group for Bambu Studio AMS."
  }</metadata>
  <resources>
${groups}
${meshObjects}
${assemblyObjects}
  </resources>
  <build>
${items}
  </build>
</model>
`;
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function contentTypes() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml" />
  <Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml" />
  <Override PartName="/3D/3dmodel.model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml" />
</Types>
`;
}

function rootRels() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel" />
</Relationships>
`;
}

function fileSlug(batch: BuiltBatch) {
  if (batch.items.length === 1) {
    return batch.items[0].label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }
  const head = batch.items
    .slice(0, 3)
    .map((item) => item.label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""))
    .filter(Boolean)
    .join("-");
  return `${head || "batch"}-${batch.items.length}`;
}

export async function export3mf(batch: BuiltBatch, params: KeychainParams) {
  const filaments = usedFilaments(batch, params);
  const { assemblies, repairedParts } = await collectAssemblies(batch, filaments, params);

  const zip = new JSZip();
  zip.file("[Content_Types].xml", contentTypes());
  zip.folder("_rels")?.file(".rels", rootRels());
  zip.folder("3D")?.file("3dmodel.model", modelXml(batch, filaments, assemblies, params));

  const blob = await zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
    mimeType: "model/3mf",
  });
  const suffix =
    params.productType === "clicker-v2"
      ? "clicker-v2"
      : params.productType === "clicker"
        ? "clicker"
        : params.productType === "monogram"
          ? "letter-stand"
          : params.productType === "nameplate"
            ? "name-plate"
            : "keychain";
  const filename = `${fileSlug(batch) || suffix}-${suffix}.3mf`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  return { filename, repairedParts };
}
