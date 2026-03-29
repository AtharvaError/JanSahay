"use client";

import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Sphere, Torus, MeshDistortMaterial } from "@react-three/drei";
import * as THREE from "three";

function OrbitalSphere() {
  const sphereRef  = useRef<THREE.Mesh>(null);
  const ring1Ref   = useRef<THREE.Mesh>(null);
  const ring2Ref   = useRef<THREE.Mesh>(null);
  const ring3Ref   = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;

    if (sphereRef.current) {
      // Gentle float + slow self-rotation
      sphereRef.current.position.y = Math.sin(t * 0.7) * 0.18;
      sphereRef.current.rotation.y = t * 0.18;
      sphereRef.current.rotation.x = t * 0.08;
    }
    if (ring1Ref.current) {
      ring1Ref.current.rotation.z = t * 0.55;
      ring1Ref.current.rotation.x = Math.PI / 2 + Math.sin(t * 0.3) * 0.12;
    }
    if (ring2Ref.current) {
      ring2Ref.current.rotation.y = t * 0.38;
      ring2Ref.current.rotation.z = t * 0.22;
    }
    if (ring3Ref.current) {
      ring3Ref.current.rotation.x = -t * 0.28;
      ring3Ref.current.rotation.z = t * 0.15;
    }
  });

  return (
    <group>
      {/* Core sphere — deep blue with fluid distortion */}
      <Sphere ref={sphereRef} args={[1, 96, 96]}>
        <MeshDistortMaterial
          color="#2563eb"
          attach="material"
          distort={0.32}
          speed={1.8}
          roughness={0.05}
          metalness={0.75}
          emissive="#1e40af"
          emissiveIntensity={0.55}
        />
      </Sphere>

      {/* Ring 1 — closest, bright sky-blue, equatorial */}
      <Torus ref={ring1Ref} args={[1.58, 0.042, 24, 120]}>
        <meshStandardMaterial
          color="#60a5fa"
          emissive="#3b82f6"
          emissiveIntensity={0.7}
          roughness={0.1}
          metalness={0.5}
          transparent
          opacity={0.92}
        />
      </Torus>

      {/* Ring 2 — mid-distance, indigo, tilted */}
      <Torus ref={ring2Ref} args={[2.05, 0.028, 20, 120]} rotation={[Math.PI / 4, Math.PI / 6, 0]}>
        <meshStandardMaterial
          color="#818cf8"
          emissive="#6366f1"
          emissiveIntensity={0.55}
          roughness={0.15}
          metalness={0.4}
          transparent
          opacity={0.82}
        />
      </Torus>

      {/* Ring 3 — outermost, violet, opposite tilt */}
      <Torus ref={ring3Ref} args={[2.52, 0.018, 16, 120]} rotation={[-Math.PI / 5, 0, Math.PI / 3]}>
        <meshStandardMaterial
          color="#a78bfa"
          emissive="#7c3aed"
          emissiveIntensity={0.4}
          roughness={0.2}
          metalness={0.35}
          transparent
          opacity={0.68}
        />
      </Torus>

      {/* Lighting */}
      <pointLight position={[3.5, 3, 3]}   intensity={2.2} color="#60a5fa" />
      <pointLight position={[-3, -2, 2]}   intensity={1.4} color="#818cf8" />
      <pointLight position={[0,  -3.5, 1]} intensity={0.9} color="#7c3aed" />
      <ambientLight intensity={0.3} />
    </group>
  );
}

export default function AIMascot() {
  return (
    <div className="w-full h-full" aria-hidden="true">
      <Canvas camera={{ position: [0, 0, 5], fov: 46 }}>
        <OrbitalSphere />
      </Canvas>
    </div>
  );
}
