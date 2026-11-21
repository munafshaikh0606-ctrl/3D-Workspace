/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useRef, useMemo, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { CustomizerState } from "../types";
import { createProceduralStoneMaps, createProceduralWeaveMap } from "../three/proceduralAssets";

interface RobotModelProps {
  customizer: CustomizerState;
  gesture: string;
  isSoftwareGl?: boolean;
}

export default function RobotModel({ customizer, gesture, isSoftwareGl = false }: RobotModelProps) {
  const { gl } = useThree();
  const robotGroupRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);
  const floatingRingRef = useRef<THREE.Mesh>(null);
  const thrusterRef = useRef<THREE.PointLight>(null);

  const proceduralTextures = useMemo(() => {
    const maxAniso = Math.min(gl.capabilities.getMaxAnisotropy(), 8);
    const stone = createProceduralStoneMaps(maxAniso);
    const weave = createProceduralWeaveMap(maxAniso);
    return { stone, weave };
  }, [gl]);

  const strawHatGeometry = useMemo(() => {
    const points = [
      new THREE.Vector2(0.001, 0.14),
      new THREE.Vector2(0.14, 0.09),
      new THREE.Vector2(0.32, 0.01),
      new THREE.Vector2(0.54, -0.09),
      new THREE.Vector2(0.57, -0.105),
      new THREE.Vector2(0.55, -0.115),
    ];
    const geo = new THREE.LatheGeometry(points, 36);
    geo.computeVertexNormals();
    return geo;
  }, []);

  useEffect(() => {
    return () => {
      proceduralTextures.stone.map.dispose();
      proceduralTextures.stone.bumpMap.dispose();
      proceduralTextures.weave.dispose();
      strawHatGeometry.dispose();
    };
  }, [proceduralTextures, strawHatGeometry]);

  // Memoize materials based on customizer settings to map to Kungfu Panda features!
  const pandaMaterials = useMemo(() => {
    const baseColor = new THREE.Color(customizer.robotBaseColor); // Po's Shorts Paint
    const accentColor = new THREE.Color(customizer.robotAccentColor); // Po's Sash/Belt & Bamboo
    const screenColor = new THREE.Color(customizer.robotScreenColor); // Glowing Jade Pupils

    let skinWhiteMat: THREE.Material;
    let skinBlackMat: THREE.Material;
    let baseMat: THREE.Material; // Shorts
    let accentMat: THREE.Material; // Sash / Staff

    switch (customizer.robotMaterialPreset) {
      case "holographic":
        // Semi-transparent glassy glowing look (safe fallback on software WebGL)
        skinWhiteMat = new THREE.MeshPhysicalMaterial({
          color: "#ffffff",
          transparent: true,
          opacity: isSoftwareGl ? 0.45 : 0.65,
          transmission: isSoftwareGl ? 0 : 0.6,
          ior: 1.45,
          thickness: 0.6,
          roughness: 0.1,
          metalness: 0.1,
          clearcoat: 1.0,
          side: THREE.DoubleSide,
        });
        skinBlackMat = new THREE.MeshPhysicalMaterial({
          color: "#1f2937",
          transparent: true,
          opacity: isSoftwareGl ? 0.55 : 0.65,
          transmission: isSoftwareGl ? 0 : 0.5,
          ior: 1.45,
          thickness: 0.5,
          roughness: 0.12,
          metalness: 0.2,
          side: THREE.DoubleSide,
        });
        baseMat = new THREE.MeshPhysicalMaterial({
          color: baseColor,
          transparent: true,
          opacity: isSoftwareGl ? 0.45 : 0.65,
          transmission: isSoftwareGl ? 0 : 0.6,
          ior: 1.45,
          thickness: 0.6,
          roughness: 0.1,
          metalness: 0.1,
          clearcoat: 1.0,
        });
        accentMat = new THREE.MeshStandardMaterial({
          color: accentColor,
          emissive: accentColor,
          emissiveIntensity: 1.2,
          roughness: 0.2,
          metalness: 0.8,
        });
        break;

      case "glow_neon":
        // Highly emissive Tron-like cyber panda look
        skinWhiteMat = new THREE.MeshStandardMaterial({
          color: "#0f172a",
          emissive: "#ffffff",
          emissiveIntensity: 0.2,
          roughness: 0.3,
          metalness: 0.8,
        });
        skinBlackMat = new THREE.MeshStandardMaterial({
          color: "#020617",
          emissive: "#000000",
          roughness: 0.5,
          metalness: 0.9,
        });
        baseMat = new THREE.MeshStandardMaterial({
          color: "#020617",
          roughness: 0.4,
          metalness: 0.9,
        });
        accentMat = new THREE.MeshStandardMaterial({
          color: accentColor,
          emissive: accentColor,
          emissiveIntensity: 3.0,
          roughness: 0.1,
        });
        break;

      case "matte":
        // Soft matte fluffy fur visual style (default Po look)
        skinWhiteMat = new THREE.MeshStandardMaterial({
          color: "#f8fafc",
          roughness: 0.9,
          metalness: 0.05,
        });
        skinBlackMat = new THREE.MeshStandardMaterial({
          color: "#18181b",
          roughness: 0.9,
          metalness: 0.02,
        });
        baseMat = new THREE.MeshStandardMaterial({
          color: baseColor,
          roughness: 0.85,
          metalness: 0.1,
        });
        accentMat = new THREE.MeshStandardMaterial({
          color: accentColor,
          roughness: 0.7,
          metalness: 0.2,
        });
        break;

      case "metallic":
      default:
        // Highly reflective cyber kungfu panda chrome/aluminum armor look
        skinWhiteMat = new THREE.MeshStandardMaterial({
          color: "#f1f5f9",
          roughness: customizer.robotRoughness,
          metalness: customizer.robotMetallic,
        });
        skinBlackMat = new THREE.MeshStandardMaterial({
          color: "#0f172a",
          roughness: customizer.robotRoughness + 0.1,
          metalness: customizer.robotMetallic,
        });
        baseMat = new THREE.MeshStandardMaterial({
          color: baseColor,
          roughness: customizer.robotRoughness,
          metalness: customizer.robotMetallic,
        });
        accentMat = new THREE.MeshStandardMaterial({
          color: accentColor,
          roughness: 0.15,
          metalness: 0.9,
        });
        break;
    }

    const eyeMat = new THREE.MeshStandardMaterial({
      color: screenColor,
      emissive: screenColor,
      emissiveIntensity: 1.5,
      roughness: 0.1,
      metalness: 0.9,
    });

    const standardWhiteMat = new THREE.MeshStandardMaterial({
      color: "#ffffff",
      roughness: 0.5,
    });

    const standardBlackMat = new THREE.MeshStandardMaterial({
      color: "#000000",
      roughness: 0.5,
    });

    // Bamboo Pole Material
    const bambooMat = new THREE.MeshStandardMaterial({
      color: accentColor,
      emissive: accentColor,
      emissiveIntensity: 0.6,
      roughness: 0.3,
      metalness: 0.5,
    });

    // Straw Hat Material with procedural weave bump
    const strawMat = new THREE.MeshStandardMaterial({
      color: "#d97706",
      bumpMap: proceduralTextures.weave,
      bumpScale: 0.015,
      roughness: 0.88,
      metalness: 0.05,
      side: THREE.DoubleSide,
    });

    // Platform Material with procedural stone texture & bump
    const stoneMat = new THREE.MeshStandardMaterial({
      color: "#334155",
      map: proceduralTextures.stone.map,
      bumpMap: proceduralTextures.stone.bumpMap,
      bumpScale: 0.025,
      roughness: 0.86,
      metalness: 0.18,
    });

    return { skinWhiteMat, skinBlackMat, baseMat, accentMat, eyeMat, standardWhiteMat, standardBlackMat, bambooMat, strawMat, stoneMat };
  }, [
    customizer.robotMaterialPreset,
    customizer.robotBaseColor,
    customizer.robotAccentColor,
    customizer.robotScreenColor,
    customizer.robotRoughness,
    customizer.robotMetallic,
    isSoftwareGl,
    proceduralTextures,
  ]);

  // Frame animation loop executing with frame-rate independent exponential damping
  useFrame((state, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const time = state.clock.getElapsedTime();

    if (robotGroupRef.current) {
      // 1. Floating Idle Animation (Chi levitation sway)
      const hoverAmp = gesture === "happy" ? 0.35 : gesture === "dance" ? 0.22 : 0.12;
      const hoverFreq = gesture === "happy" ? 4.5 : gesture === "dance" ? 3.0 : 1.5;
      robotGroupRef.current.position.y = Math.sin(time * hoverFreq) * hoverAmp;
      
      // Idle tilt
      robotGroupRef.current.rotation.z = Math.sin(time * 0.8) * 0.02;
      robotGroupRef.current.rotation.x = Math.cos(time * 0.6) * 0.01;

      {/* 2. Head movements with exponential damping */}
      if (headRef.current) {
        if (gesture === "thinking") {
          headRef.current.rotation.z = THREE.MathUtils.damp(headRef.current.rotation.z, 0.25 + Math.sin(time * 2.0) * 0.03, 7, delta);
          headRef.current.rotation.x = THREE.MathUtils.damp(headRef.current.rotation.x, 0.05, 7, delta);
          headRef.current.rotation.y = THREE.MathUtils.damp(headRef.current.rotation.y, -0.15, 7, delta);
        } else if (gesture === "nod") {
          headRef.current.rotation.x = THREE.MathUtils.damp(headRef.current.rotation.x, Math.sin(time * 6.0) * 0.12 + 0.15, 9, delta);
          headRef.current.rotation.z = THREE.MathUtils.damp(headRef.current.rotation.z, 0, 7, delta);
          headRef.current.rotation.y = THREE.MathUtils.damp(headRef.current.rotation.y, 0, 7, delta);
        } else if (gesture === "surprise") {
          headRef.current.rotation.x = THREE.MathUtils.damp(headRef.current.rotation.x, -0.22, 10, delta);
          headRef.current.rotation.y = THREE.MathUtils.damp(headRef.current.rotation.y, 0, 7, delta);
          headRef.current.rotation.z = THREE.MathUtils.damp(headRef.current.rotation.z, Math.sin(time * 12) * 0.03, 12, delta);
        } else if (gesture === "dance") {
          headRef.current.rotation.y = THREE.MathUtils.damp(headRef.current.rotation.y, Math.sin(time * 5.0) * 0.35, 7, delta);
          headRef.current.rotation.x = THREE.MathUtils.damp(headRef.current.rotation.x, Math.cos(time * 3.5) * 0.12, 7, delta);
          headRef.current.rotation.z = THREE.MathUtils.damp(headRef.current.rotation.z, Math.sin(time * 2.5) * 0.12, 7, delta);
        } else if (gesture === "happy") {
          headRef.current.rotation.x = THREE.MathUtils.damp(headRef.current.rotation.x, Math.sin(time * 9.0) * 0.1, 9, delta);
          headRef.current.rotation.y = THREE.MathUtils.damp(headRef.current.rotation.y, Math.cos(time * 4.5) * 0.12, 7, delta);
          headRef.current.rotation.z = THREE.MathUtils.damp(headRef.current.rotation.z, 0, 7, delta);
        } else {
          headRef.current.rotation.y = THREE.MathUtils.damp(headRef.current.rotation.y, Math.sin(time * 0.5) * 0.15, 4, delta);
          headRef.current.rotation.x = THREE.MathUtils.damp(headRef.current.rotation.x, Math.cos(time * 0.3) * 0.04 + 0.02, 4, delta);
          headRef.current.rotation.z = THREE.MathUtils.damp(headRef.current.rotation.z, 0, 4, delta);
        }
      }

      // 3. Left and Right Arms
      if (leftArmRef.current && rightArmRef.current) {
        if (gesture === "wave") {
          rightArmRef.current.rotation.z = THREE.MathUtils.damp(rightArmRef.current.rotation.z, -1.8, 7, delta);
          rightArmRef.current.rotation.x = THREE.MathUtils.damp(rightArmRef.current.rotation.x, Math.sin(time * 8.0) * 0.45 - 0.2, 10, delta);

          leftArmRef.current.rotation.z = THREE.MathUtils.damp(leftArmRef.current.rotation.z, 0.35 + Math.sin(time * 1.5) * 0.05, 6, delta);
          leftArmRef.current.rotation.x = THREE.MathUtils.damp(leftArmRef.current.rotation.x, 0.2, 6, delta);
        } else if (gesture === "thinking") {
          rightArmRef.current.rotation.z = THREE.MathUtils.damp(rightArmRef.current.rotation.z, -0.4, 7, delta);
          rightArmRef.current.rotation.x = THREE.MathUtils.damp(rightArmRef.current.rotation.x, -1.1, 7, delta);
          rightArmRef.current.rotation.y = THREE.MathUtils.damp(rightArmRef.current.rotation.y, -0.5, 7, delta);

          leftArmRef.current.rotation.z = THREE.MathUtils.damp(leftArmRef.current.rotation.z, 0.45, 7, delta);
          leftArmRef.current.rotation.x = THREE.MathUtils.damp(leftArmRef.current.rotation.x, 0.5, 7, delta);
        } else if (gesture === "happy") {
          rightArmRef.current.rotation.z = THREE.MathUtils.damp(rightArmRef.current.rotation.z, -2.1 + Math.sin(time * 12.0) * 0.12, 9, delta);
          leftArmRef.current.rotation.z = THREE.MathUtils.damp(leftArmRef.current.rotation.z, 2.1 + Math.sin(time * 12.0) * 0.12, 9, delta);
          rightArmRef.current.rotation.x = THREE.MathUtils.damp(rightArmRef.current.rotation.x, -0.6, 7, delta);
          leftArmRef.current.rotation.x = THREE.MathUtils.damp(leftArmRef.current.rotation.x, -0.6, 7, delta);
        } else if (gesture === "nod") {
          rightArmRef.current.rotation.z = THREE.MathUtils.damp(rightArmRef.current.rotation.z, -0.8, 9, delta);
          rightArmRef.current.rotation.x = THREE.MathUtils.damp(rightArmRef.current.rotation.x, -0.9, 9, delta);
          rightArmRef.current.rotation.y = THREE.MathUtils.damp(rightArmRef.current.rotation.y, -0.4, 9, delta);

          leftArmRef.current.rotation.z = THREE.MathUtils.damp(leftArmRef.current.rotation.z, 0.8, 9, delta);
          leftArmRef.current.rotation.x = THREE.MathUtils.damp(leftArmRef.current.rotation.x, -0.9, 9, delta);
          leftArmRef.current.rotation.y = THREE.MathUtils.damp(leftArmRef.current.rotation.y, 0.4, 9, delta);
        } else if (gesture === "surprise") {
          rightArmRef.current.rotation.z = THREE.MathUtils.damp(rightArmRef.current.rotation.z, -1.2, 10, delta);
          leftArmRef.current.rotation.z = THREE.MathUtils.damp(leftArmRef.current.rotation.z, 1.2, 10, delta);
          rightArmRef.current.rotation.x = THREE.MathUtils.damp(rightArmRef.current.rotation.x, 0.8, 10, delta);
          leftArmRef.current.rotation.x = THREE.MathUtils.damp(leftArmRef.current.rotation.x, 0.8, 10, delta);
        } else if (gesture === "dance") {
          rightArmRef.current.rotation.z = THREE.MathUtils.damp(rightArmRef.current.rotation.z, -1.5 + Math.sin(time * 4) * 0.4, 7, delta);
          leftArmRef.current.rotation.z = THREE.MathUtils.damp(leftArmRef.current.rotation.z, 0.6 + Math.cos(time * 4) * 0.3, 7, delta);
          rightArmRef.current.rotation.x = THREE.MathUtils.damp(rightArmRef.current.rotation.x, Math.sin(time * 5.0) * 0.4, 7, delta);
          leftArmRef.current.rotation.x = THREE.MathUtils.damp(leftArmRef.current.rotation.x, -0.5 + Math.cos(time * 5.0) * 0.4, 7, delta);
        } else {
          rightArmRef.current.rotation.z = THREE.MathUtils.damp(rightArmRef.current.rotation.z, -0.45 - Math.sin(time * 1.5) * 0.04, 4, delta);
          rightArmRef.current.rotation.x = THREE.MathUtils.damp(rightArmRef.current.rotation.x, 0.2 + Math.cos(time * 1.0) * 0.04, 4, delta);
          rightArmRef.current.rotation.y = THREE.MathUtils.damp(rightArmRef.current.rotation.y, 0.0, 4, delta);

          leftArmRef.current.rotation.z = THREE.MathUtils.damp(leftArmRef.current.rotation.z, 0.45 + Math.sin(time * 1.5) * 0.04, 4, delta);
          leftArmRef.current.rotation.x = THREE.MathUtils.damp(leftArmRef.current.rotation.x, 0.2 + Math.cos(time * 1.0) * 0.04, 4, delta);
          leftArmRef.current.rotation.y = THREE.MathUtils.damp(leftArmRef.current.rotation.y, 0.0, 4, delta);
        }
      }

      // 4. Leg controls
      if (leftLegRef.current && rightLegRef.current) {
        if (gesture === "dance") {
          leftLegRef.current.rotation.z = THREE.MathUtils.damp(leftLegRef.current.rotation.z, 0.3, 7, delta);
          leftLegRef.current.position.y = THREE.MathUtils.damp(leftLegRef.current.position.y, -0.58, 7, delta);
          leftLegRef.current.position.x = THREE.MathUtils.damp(leftLegRef.current.position.x, -0.16, 7, delta);

          rightLegRef.current.rotation.z = THREE.MathUtils.damp(rightLegRef.current.rotation.z, -1.9, 7, delta);
          rightLegRef.current.position.y = THREE.MathUtils.damp(rightLegRef.current.position.y, 0.2, 7, delta);
          rightLegRef.current.position.x = THREE.MathUtils.damp(rightLegRef.current.position.x, 0.4, 7, delta);
        } else if (gesture === "happy") {
          leftLegRef.current.rotation.z = THREE.MathUtils.damp(leftLegRef.current.rotation.z, 0.15, 7, delta);
          leftLegRef.current.rotation.x = THREE.MathUtils.damp(leftLegRef.current.rotation.x, -0.3, 7, delta);
          leftLegRef.current.position.y = THREE.MathUtils.damp(leftLegRef.current.position.y, -0.5, 7, delta);
          leftLegRef.current.position.x = THREE.MathUtils.damp(leftLegRef.current.position.x, -0.22, 7, delta);

          rightLegRef.current.rotation.z = THREE.MathUtils.damp(rightLegRef.current.rotation.z, -0.15, 7, delta);
          rightLegRef.current.rotation.x = THREE.MathUtils.damp(rightLegRef.current.rotation.x, -0.3, 7, delta);
          rightLegRef.current.position.y = THREE.MathUtils.damp(rightLegRef.current.position.y, -0.5, 7, delta);
          rightLegRef.current.position.x = THREE.MathUtils.damp(rightLegRef.current.position.x, 0.22, 7, delta);
        } else if (gesture === "nod") {
          leftLegRef.current.rotation.z = THREE.MathUtils.damp(leftLegRef.current.rotation.z, 0.1, 7, delta);
          leftLegRef.current.position.y = THREE.MathUtils.damp(leftLegRef.current.position.y, -0.65, 7, delta);
          leftLegRef.current.position.x = THREE.MathUtils.damp(leftLegRef.current.position.x, -0.25, 7, delta);

          rightLegRef.current.rotation.z = THREE.MathUtils.damp(rightLegRef.current.rotation.z, -0.1, 7, delta);
          rightLegRef.current.position.y = THREE.MathUtils.damp(rightLegRef.current.position.y, -0.65, 7, delta);
          rightLegRef.current.position.x = THREE.MathUtils.damp(rightLegRef.current.position.x, 0.25, 7, delta);
        } else {
          leftLegRef.current.rotation.z = THREE.MathUtils.damp(leftLegRef.current.rotation.z, 0, 4, delta);
          leftLegRef.current.rotation.x = THREE.MathUtils.damp(leftLegRef.current.rotation.x, 0, 4, delta);
          leftLegRef.current.position.y = THREE.MathUtils.damp(leftLegRef.current.position.y, -0.65, 4, delta);
          leftLegRef.current.position.x = THREE.MathUtils.damp(leftLegRef.current.position.x, -0.25, 4, delta);

          rightLegRef.current.rotation.z = THREE.MathUtils.damp(rightLegRef.current.rotation.z, 0, 4, delta);
          rightLegRef.current.rotation.x = THREE.MathUtils.damp(rightLegRef.current.rotation.x, 0, 4, delta);
          rightLegRef.current.position.y = THREE.MathUtils.damp(rightLegRef.current.position.y, -0.65, 4, delta);
          rightLegRef.current.position.x = THREE.MathUtils.damp(rightLegRef.current.position.x, 0.25, 4, delta);
        }
      }
    }

    // 5. Aura/Chi ring animation
    if (floatingRingRef.current) {
      floatingRingRef.current.rotation.z = time * 1.2;
      floatingRingRef.current.rotation.x = Math.sin(time * 0.5) * 0.1 + 1.2;
    }

    // 6. Platform Chi glowing core light
    if (thrusterRef.current) {
      thrusterRef.current.intensity = 1.2 + Math.sin(time * 8.0) * 0.35 + (gesture === "happy" ? 0.9 : gesture === "dance" ? 0.6 : 0);
    }
  });

  return (
    <group ref={robotGroupRef}>
      {/* 1. platform: Grounded Training Stump / Rock peak beneath Po */}
      <group position={[0, -0.82, 0]}>
        <mesh material={pandaMaterials.stoneMat} castShadow receiveShadow>
          <cylinderGeometry args={[0.66, 0.58, 0.24, 24]} />
        </mesh>
        {/* Glow circle details on platform with polygonOffset to avoid Z-fighting */}
        <mesh position={[0, 0.125, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.45, 0.52, 24]} />
          <meshBasicMaterial
            color={customizer.robotAccentColor}
            transparent
            opacity={0.65}
            polygonOffset
            polygonOffsetFactor={-1}
            polygonOffsetUnits={-1}
          />
        </mesh>
        <mesh position={[0, 0.125, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.16, 24]} />
          <meshBasicMaterial
            color={customizer.robotAccentColor}
            transparent
            opacity={0.45}
            polygonOffset
            polygonOffsetFactor={-1}
            polygonOffsetUnits={-1}
          />
        </mesh>
        {/* Point light shining up onto Po */}
        <pointLight
          ref={thrusterRef}
          color={customizer.robotAccentColor}
          distance={1.6}
          decay={1.8}
          position={[0, 0.28, 0]}
        />
      </group>

      {/* 2. PANDA TORSO / MAIN BODY */}
      <group position={[0, -0.1, 0]}>
        {/* Fluffy Round Stomach (White Fur) */}
        <mesh material={pandaMaterials.skinWhiteMat} castShadow receiveShadow position={[0, -0.05, 0.02]} scale={[1.1, 1.0, 1.0]}>
          <sphereGeometry args={[0.55, 32, 32]} />
        </mesh>

        {/* Black Fur Shoulder Overlay (connecting arms to neck) */}
        <mesh material={pandaMaterials.skinBlackMat} castShadow position={[0, 0.22, -0.04]} scale={[1.05, 0.72, 0.92]}>
          <sphereGeometry args={[0.48, 32, 16]} />
        </mesh>

        {/* Traditional Patched Shorts/Pants (Customizable base color) */}
        <mesh material={pandaMaterials.baseMat} castShadow position={[0, -0.32, 0.01]} scale={[1.14, 0.72, 1.05]}>
          <sphereGeometry args={[0.52, 32, 32]} />
        </mesh>

        {/* Red & Yellow Striped Waistband/Sash (Customizable Accent Color) */}
        <mesh position={[0, -0.15, 0]} rotation={[0.08, 0, 0]} material={pandaMaterials.accentMat} castShadow>
          <torusGeometry args={[0.54, 0.06, 12, 32]} />
        </mesh>

        {/* Cute Patches on Po's Shorts */}
        <mesh position={[-0.2, -0.38, 0.44]} rotation={[0.1, 0.2, 0.15]} material={pandaMaterials.stoneMat}>
          <boxGeometry args={[0.09, 0.09, 0.015]} />
        </mesh>
        <mesh position={[0.24, -0.35, 0.42]} rotation={[0.05, -0.15, -0.1]} material={pandaMaterials.stoneMat}>
          <boxGeometry args={[0.08, 0.08, 0.015]} />
        </mesh>
      </group>

      {/* 3. SHIN-BANDAGED LEGS */}
      {/* Left Leg */}
      <group ref={leftLegRef} position={[-0.25, -0.65, 0]}>
        {/* Upper thigh (Black fur) */}
        <mesh position={[0, 0.12, 0]} material={pandaMaterials.skinBlackMat} castShadow>
          <sphereGeometry args={[0.18, 16, 16]} />
        </mesh>
        {/* Bandaged shin/calf */}
        <mesh position={[0, -0.05, 0]} material={pandaMaterials.standardWhiteMat} castShadow>
          <cylinderGeometry args={[0.13, 0.11, 0.25, 16]} />
        </mesh>
        {/* Bandage rings wraps details */}
        <mesh position={[0, 0.04, 0]} material={pandaMaterials.standardWhiteMat}>
          <torusGeometry args={[0.135, 0.015, 8, 16]} />
        </mesh>
        <mesh position={[0, -0.04, 0]} material={pandaMaterials.standardWhiteMat}>
          <torusGeometry args={[0.125, 0.015, 8, 16]} />
        </mesh>
        {/* Black Fur foot paw */}
        <mesh position={[0, -0.18, 0.08]} scale={[1, 0.7, 1.4]} material={pandaMaterials.skinBlackMat} castShadow>
          <sphereGeometry args={[0.13, 16, 16]} />
        </mesh>
      </group>

      {/* Right Leg */}
      <group ref={rightLegRef} position={[0.25, -0.65, 0]}>
        {/* Upper thigh (Black fur) */}
        <mesh position={[0, 0.12, 0]} material={pandaMaterials.skinBlackMat} castShadow>
          <sphereGeometry args={[0.18, 16, 16]} />
        </mesh>
        {/* Bandaged shin/calf */}
        <mesh position={[0, -0.05, 0]} material={pandaMaterials.standardWhiteMat} castShadow>
          <cylinderGeometry args={[0.13, 0.11, 0.25, 16]} />
        </mesh>
        {/* Bandage rings wraps details */}
        <mesh position={[0, 0.04, 0]} material={pandaMaterials.standardWhiteMat}>
          <torusGeometry args={[0.135, 0.015, 8, 16]} />
        </mesh>
        <mesh position={[0, -0.04, 0]} material={pandaMaterials.standardWhiteMat}>
          <torusGeometry args={[0.125, 0.015, 8, 16]} />
        </mesh>
        {/* Black Fur foot paw */}
        <mesh position={[0, -0.18, 0.08]} scale={[1, 0.7, 1.4]} material={pandaMaterials.skinBlackMat} castShadow>
          <sphereGeometry args={[0.13, 16, 16]} />
        </mesh>
      </group>

      {/* 4. CHUNKY BLACK ARMS */}
      {/* Left Arm Group */}
      <group ref={leftArmRef} position={[-0.55, 0.1, -0.02]}>
        {/* Shoulder Joint */}
        <mesh material={pandaMaterials.skinBlackMat}>
          <sphereGeometry args={[0.15, 16, 16]} />
        </mesh>
        {/* Upper Arm cylinder */}
        <mesh position={[-0.15, -0.12, 0.05]} rotation={[0.2, 0, 0.35]} material={pandaMaterials.skinBlackMat} castShadow>
          <cylinderGeometry args={[0.13, 0.11, 0.32, 16]} />
        </mesh>
        {/* Elbow Joint */}
        <mesh position={[-0.22, -0.28, 0.08]} material={pandaMaterials.skinBlackMat}>
          <sphereGeometry args={[0.12, 16, 16]} />
        </mesh>
        {/* Forearm and paw */}
        <mesh position={[-0.26, -0.42, 0.14]} rotation={[0.4, 0, 0.1]} material={pandaMaterials.skinBlackMat} castShadow>
          <cylinderGeometry args={[0.12, 0.1, 0.28, 16]} />
        </mesh>
        {/* Hand/Paw sphere */}
        <mesh position={[-0.29, -0.56, 0.22]} material={pandaMaterials.skinBlackMat} castShadow>
          <sphereGeometry args={[0.11, 16, 16]} />
        </mesh>
      </group>

      {/* Right Arm Group */}
      <group ref={rightArmRef} position={[0.55, 0.1, -0.02]}>
        {/* Shoulder Joint */}
        <mesh material={pandaMaterials.skinBlackMat}>
          <sphereGeometry args={[0.15, 16, 16]} />
        </mesh>
        {/* Upper Arm cylinder */}
        <mesh position={[0.15, -0.12, 0.05]} rotation={[0.2, 0, -0.35]} material={pandaMaterials.skinBlackMat} castShadow>
          <cylinderGeometry args={[0.13, 0.11, 0.32, 16]} />
        </mesh>
        {/* Elbow Joint */}
        <mesh position={[0.22, -0.28, 0.08]} material={pandaMaterials.skinBlackMat}>
          <sphereGeometry args={[0.12, 16, 16]} />
        </mesh>
        {/* Forearm and paw */}
        <mesh position={[0.26, -0.42, 0.14]} rotation={[0.4, 0, -0.1]} material={pandaMaterials.skinBlackMat} castShadow>
          <cylinderGeometry args={[0.12, 0.1, 0.28, 16]} />
        </mesh>
        {/* Hand/Paw sphere */}
        <mesh position={[0.29, -0.56, 0.22]} material={pandaMaterials.skinBlackMat} castShadow>
          <sphereGeometry args={[0.11, 16, 16]} />
        </mesh>

        {/* BAMBOO STAFF OF WISDOM ACCESSORY (Mounted in Po's right hand!) */}
        {customizer.accessory === "antenna" && (
          <group position={[0.3, -0.58, 0.24]} rotation={[1.1, 0.2, -0.3]}>
            {/* Glowing Jade Bamboo Pole */}
            <mesh material={pandaMaterials.bambooMat} castShadow>
              <cylinderGeometry args={[0.028, 0.025, 1.4, 12]} />
            </mesh>
            {/* Bamboo rings joints details */}
            <mesh position={[0, 0.4, 0]} material={pandaMaterials.accentMat}>
              <torusGeometry args={[0.033, 0.012, 8, 12]} />
            </mesh>
            <mesh position={[0, 0.1, 0]} material={pandaMaterials.accentMat}>
              <torusGeometry args={[0.032, 0.012, 8, 12]} />
            </mesh>
            <mesh position={[0, -0.2, 0]} material={pandaMaterials.accentMat}>
              <torusGeometry args={[0.031, 0.012, 8, 12]} />
            </mesh>
            <mesh position={[0, -0.5, 0]} material={pandaMaterials.accentMat}>
              <torusGeometry args={[0.03, 0.012, 8, 12]} />
            </mesh>
            {/* Staff top glowing jade emblem */}
            <mesh position={[0, 0.74, 0]} material={pandaMaterials.eyeMat}>
              <sphereGeometry args={[0.06, 16, 16]} />
            </mesh>
          </group>
        )}
      </group>

      {/* 5. CUTE ROUND HEAD GROUP */}
      <group ref={headRef} position={[0, 0.44, 0.01]}>
        {/* Head Base (White Fur) */}
        <mesh material={pandaMaterials.skinWhiteMat} castShadow scale={[1.1, 0.96, 1.02]}>
          <sphereGeometry args={[0.42, 32, 32]} />
        </mesh>

        {/* Soft Snout/Muzzle (White Fur, slightly protruding) */}
        <mesh position={[0, -0.08, 0.28]} scale={[1.25, 0.95, 1.2]} material={pandaMaterials.skinWhiteMat} castShadow>
          <sphereGeometry args={[0.15, 16, 16]} />
        </mesh>

        {/* Black Nose (Rounded triangle) */}
        <mesh position={[0, -0.01, 0.44]} scale={[1.2, 1.0, 0.8]} material={pandaMaterials.standardBlackMat} castShadow>
          <sphereGeometry args={[0.04, 16, 16]} />
        </mesh>

        {/* Cute Smile / Cheeky Mouth */}
        <mesh position={[0, -0.13, 0.38]} rotation={[0.08, 0, 0]} material={pandaMaterials.standardBlackMat}>
          <boxGeometry args={[0.1, 0.015, 0.04]} />
        </mesh>

        {/* Iconic Black Eye Patches */}
        {/* Left Eyepatch */}
        <mesh position={[-0.15, 0.08, 0.26]} rotation={[0.1, -0.15, -0.25]} scale={[1.0, 1.3, 0.4]} material={pandaMaterials.skinBlackMat} castShadow>
          <sphereGeometry args={[0.12, 16, 16]} />
        </mesh>
        {/* Right Eyepatch */}
        <mesh position={[0.15, 0.08, 0.26]} rotation={[0.1, 0.15, 0.25]} scale={[1.0, 1.3, 0.4]} material={pandaMaterials.skinBlackMat} castShadow>
          <sphereGeometry args={[0.12, 16, 16]} />
        </mesh>

        {/* Expressive Jade Eyes inside patches */}
        {/* Left Eye Pupil */}
        <mesh position={[-0.135, 0.09, 0.31]}>
          <sphereGeometry args={[0.04, 16, 16]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
        <mesh position={[-0.135, 0.09, 0.335]} material={pandaMaterials.eyeMat}>
          <sphereGeometry args={[0.02, 16, 16]} />
        </mesh>
        {/* Right Eye Pupil */}
        <mesh position={[0.135, 0.09, 0.31]}>
          <sphereGeometry args={[0.04, 16, 16]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
        <mesh position={[0.135, 0.09, 0.335]} material={pandaMaterials.eyeMat}>
          <sphereGeometry args={[0.02, 16, 16]} />
        </mesh>

        {/* Black Fuzzy Ears */}
        {/* Left Ear */}
        <mesh position={[-0.34, 0.33, -0.05]} rotation={[0, 0, 0.3]} scale={[1.1, 1.1, 0.6]} material={pandaMaterials.skinBlackMat} castShadow>
          <sphereGeometry args={[0.12, 16, 16]} />
        </mesh>
        {/* Right Ear */}
        <mesh position={[0.34, 0.33, -0.05]} rotation={[0, 0, -0.3]} scale={[1.1, 1.1, 0.6]} material={pandaMaterials.skinBlackMat} castShadow>
          <sphereGeometry args={[0.12, 16, 16]} />
        </mesh>

        {/* TRADITIONAL STRAW HAT ACCESSORY (Sculpted LatheGeometry Asian straw hat!) */}
        {customizer.accessory === "cyber_ears" && (
          <group position={[0, 0.41, 0]} rotation={[0.06, 0, 0]}>
            {/* LatheGeometry Straw Cone */}
            <mesh geometry={strawHatGeometry} material={pandaMaterials.strawMat} castShadow />
            {/* Colored highlight band/string */}
            <mesh position={[0, -0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} material={pandaMaterials.accentMat}>
              <torusGeometry args={[0.28, 0.016, 10, 32]} />
            </mesh>
            {/* Hat center top node */}
            <mesh position={[0, 0.145, 0]} material={pandaMaterials.accentMat}>
              <sphereGeometry args={[0.036, 14, 14]} />
            </mesh>
          </group>
        )}
      </group>

      {/* 6. CHI ENERGY AURA RING ACCESSORY (Dragon Warrior Chi Aura) */}
      {customizer.accessory === "floating_ring" && (
        <mesh ref={floatingRingRef} position={[0, -0.05, 0]} rotation={[1.2, 0, 0]}>
          <torusGeometry args={[0.82, 0.028, 12, 48]} />
          <meshStandardMaterial
            color={customizer.robotAccentColor}
            emissive={customizer.robotAccentColor}
            emissiveIntensity={2.5}
            roughness={0.1}
          />
        </mesh>
      )}
    </group>
  );
}
