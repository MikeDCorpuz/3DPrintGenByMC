import { Bounds, ContactShadows, Grid, OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useLayoutEffect, useRef } from "react";
import type { Mesh } from "three";
import { BED_SIZE_MM } from "../lib/layout";
import type { BuiltBatch, LayerId } from "../types";

const EXPLODE_ORDER: LayerId[] = ["housing", "outer", "outline", "name"];

interface PreviewProps {
  batch: BuiltBatch | null;
  explode: number;
  showBed: boolean;
}

function Parts({
  batch,
  explode,
}: {
  batch: BuiltBatch;
  explode: number;
}) {
  const half = BED_SIZE_MM / 2;
  return (
    <group>
      {batch.items.map((item) => (
        <group key={`${item.label}-${item.x}-${item.y}`} position={[item.x - half, item.y - half, 0]}>
          {item.keychain.parts.map((part) => (
            <PartMesh
              key={`${part.id}-${part.geometry.uuid}`}
              color={part.color}
              geometry={part.geometry}
              lift={explode * Math.max(0, EXPLODE_ORDER.indexOf(part.id)) * 6}
            />
          ))}
        </group>
      ))}
    </group>
  );
}

function PartMesh({
  color,
  geometry,
  lift,
}: {
  color: string;
  geometry: BuiltBatch["items"][number]["keychain"]["parts"][number]["geometry"];
  lift: number;
}) {
  const mesh = useRef<Mesh>(null);
  useLayoutEffect(() => {
    mesh.current?.updateMatrixWorld();
  }, [geometry, lift]);

  return (
    <mesh ref={mesh} geometry={geometry} position={[0, 0, lift]} castShadow receiveShadow>
      <meshStandardMaterial
        color={color}
        roughness={0.46}
        metalness={0.04}
        envMapIntensity={0.55}
        flatShading={false}
        polygonOffset
        polygonOffsetFactor={1}
        polygonOffsetUnits={1}
      />
    </mesh>
  );
}

function Bed() {
  const size = BED_SIZE_MM;
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.08, 0]} receiveShadow>
        <planeGeometry args={[size, size]} />
        <meshStandardMaterial color="#161b24" roughness={0.92} metalness={0.05} />
      </mesh>
      <Grid
        args={[size, size]}
        cellSize={8}
        cellThickness={0.55}
        cellColor="#243044"
        sectionSize={32}
        sectionThickness={1.15}
        sectionColor="#4a5d7a"
        fadeDistance={420}
        fadeStrength={1.1}
        infiniteGrid={false}
        position={[0, -0.02, 0]}
      />
    </group>
  );
}

export function Preview({ batch, explode, showBed }: PreviewProps) {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [160, 190, 210], fov: 38, near: 0.1, far: 1200 }}
      gl={{
        antialias: true,
        preserveDrawingBuffer: true,
        powerPreference: "high-performance",
      }}
    >
      <color attach="background" args={["#0b0d11"]} />
      <hemisphereLight intensity={0.32} color="#f4efe6" groundColor="#1a1410" />
      <directionalLight
        position={[46, 28, 72]}
        intensity={1.65}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.00015}
        shadow-normalBias={0.015}
      />
      <directionalLight position={[-90, 36, 24]} intensity={0.42} color="#d5e6f4" />

      {showBed && <Bed />}

      {batch && (
        <Bounds observe margin={1.12} maxDuration={0.6}>
          <mesh visible={false}>
            <boxGeometry args={[BED_SIZE_MM, 0.2, BED_SIZE_MM]} />
          </mesh>
          <group rotation={[-Math.PI / 2, 0, 0]}>
            <Parts batch={batch} explode={explode} />
          </group>
        </Bounds>
      )}

      <ContactShadows
        position={[0, -0.1, 0]}
        opacity={0.32}
        scale={BED_SIZE_MM * 1.15}
        blur={2.4}
        far={16}
        color="#000"
      />
      <OrbitControls
        makeDefault
        enablePan
        minDistance={40}
        maxDistance={700}
        dampingFactor={0.08}
      />
    </Canvas>
  );
}
