/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import { useRef, useMemo, useEffect } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import RobotModel from "./RobotModel";
import { CustomizerState, EnvironmentPreset } from "../types";
import { createRadialContactShadowTexture, detectSoftwareWebGL } from "../three/proceduralAssets";

interface RobotCanvasProps {
  customizer: CustomizerState;
  gesture: string;
  isVideoActive: boolean;
  onStop?: () => void;
}

// Pre-allocated scratch helpers outside animation loops to avoid GC churn
const _dummy = new THREE.Object3D();
const _color = new THREE.Color();

function StudioEnvironment() {
  const { gl, scene } = useThree();

  useEffect(() => {
    const pmremGenerator = new THREE.PMREMGenerator(gl);
    const roomEnv = new RoomEnvironment();
    const envTarget = pmremGenerator.fromScene(roomEnv, 0.04);
    scene.environment = envTarget.texture;
    roomEnv.dispose();
    pmremGenerator.dispose();

    return () => {
      scene.environment = null;
      envTarget.dispose();
    };
  }, [gl, scene]);

  return null;
}

function InstancedArenaProps({
  preset,
  accentColor,
  speed,
}: {
  preset: EnvironmentPreset;
  accentColor: string;
  speed: number;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const count = 36;

  const instanceData = useMemo(() => {
    const items = [];
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.35;
      const radius = 2.6 + Math.random() * 3.8;
      const y = -0.5 + Math.random() * 2.8;
      const scale = 0.85 + Math.random() * 0.3; // ±15% variation
      const speedMul = 0.4 + Math.random() * 0.6;
      const phase = Math.random() * Math.PI * 2;
      items.push({ angle, radius, y, scale, speedMul, phase });
    }
    return items;
  }, []);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    for (let i = 0; i < count; i++) {
      const d = instanceData[i];
      _dummy.position.set(Math.cos(d.angle) * d.radius, d.y, Math.sin(d.angle) * d.radius);
      _dummy.scale.setScalar(d.scale);
      _dummy.rotation.set(d.phase * 0.3, d.angle, d.phase * 0.2);
      _dummy.updateMatrix();
      mesh.setMatrixAt(i, _dummy.matrix);

      if (preset === "matrix_grid") {
        _color.setHSL(0.36 + (i % 4) * 0.02, 0.85, 0.45);
      } else if (preset === "cyberpunk") {
        _color.setHSL(i % 2 === 0 ? 0.88 : 0.52, 0.9, 0.55);
      } else if (preset === "cosmos") {
        _color.setHSL(0.68 + (i % 5) * 0.04, 0.75, 0.58);
      } else {
        _color.set(accentColor).lerp(new THREE.Color("#10b981"), (i % 5) / 5);
      }
      mesh.setColorAt(i, _color);
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [instanceData, preset, accentColor]);

  useFrame((state) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const t = state.clock.getElapsedTime() * Math.max(speed, 0.15);

    for (let i = 0; i < count; i++) {
      const d = instanceData[i];
      const a = d.angle + t * 0.08 * d.speedMul;
      const bob = Math.sin(t * 0.9 + d.phase) * 0.18;
      _dummy.position.set(Math.cos(a) * d.radius, d.y + bob, Math.sin(a) * d.radius);
      _dummy.rotation.set(d.phase + t * 0.2, a, d.phase * 0.5);
      _dummy.scale.setScalar(d.scale);
      _dummy.updateMatrix();
      mesh.setMatrixAt(i, _dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]} frustumCulled={false}>
      <octahedronGeometry args={[0.085, 0]} />
      <meshStandardMaterial roughness={0.28} metalness={0.72} />
    </instancedMesh>
  );
}

function RadialGroundShadow() {
  const shadowTexture = useMemo(() => createRadialContactShadowTexture(), []);

  useEffect(() => {
    return () => {
      shadowTexture.dispose();
    };
  }, [shadowTexture]);

  return (
    <mesh position={[0, -0.94, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[2.8, 2.8]} />
      <meshBasicMaterial
        map={shadowTexture}
        transparent
        opacity={0.55}
        depthWrite={false}
        polygonOffset
        polygonOffsetFactor={-1}
        polygonOffsetUnits={-1}
      />
    </mesh>
  );
}

function DynamicEnvironment({
  preset,
  particleCount,
  speed,
}: {
  preset: EnvironmentPreset;
  particleCount: number;
  speed: number;
}) {
  const pointsRef = useRef<THREE.Points>(null);

  const { positions, colors } = useMemo(() => {
    const arr = new Float32Array(particleCount * 3);
    const colArr = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      let x = 0,
        y = 0,
        z = 0;
      let r = 1,
        g = 1,
        b = 1;

      if (preset === "matrix_grid") {
        x = (Math.random() - 0.5) * 12;
        y = (Math.random() - 0.5) * 12;
        z = (Math.random() - 0.5) * 12;
        r = 0.05;
        g = 0.95;
        b = 0.1;
      } else if (preset === "cyberpunk") {
        x = (Math.random() - 0.5) * 16;
        y = (Math.random() - 0.5) * 8 - 1;
        z = (Math.random() - 0.5) * 16;
        if (Math.random() > 0.5) {
          r = 0.95;
          g = 0.05;
          b = 0.6;
        } else {
          r = 0.05;
          g = 0.8;
          b = 0.95;
        }
      } else if (preset === "cosmos") {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(Math.random() * 2 - 1);
        const distance = 4 + Math.random() * 8;
        x = Math.sin(phi) * Math.cos(theta) * distance;
        y = Math.sin(phi) * Math.sin(theta) * distance;
        z = Math.cos(phi) * distance;
        const roll = Math.random();
        if (roll < 0.4) {
          r = 0.5;
          g = 0.1;
          b = 0.9;
        } else if (roll < 0.7) {
          r = 0.9;
          g = 0.4;
          b = 0.1;
        } else {
          r = 0.1;
          g = 0.2;
          b = 0.9;
        }
      } else {
        x = (Math.random() - 0.5) * 15;
        z = (Math.random() - 0.5) * 15;
        y = Math.sin(x * 0.4) * 1.5 + (Math.random() - 0.5) * 2;
        if (Math.random() > 0.4) {
          r = 0.02;
          g = 0.9;
          b = 0.4;
        } else {
          r = 0.3;
          g = 0.05;
          b = 0.95;
        }
      }

      arr[i * 3] = x;
      arr[i * 3 + 1] = y;
      arr[i * 3 + 2] = z;

      colArr[i * 3] = r;
      colArr[i * 3 + 1] = g;
      colArr[i * 3 + 2] = b;
    }

    return { positions: arr, colors: colArr };
  }, [preset, particleCount]);

  useFrame((state, rawDelta) => {
    if (!pointsRef.current) return;
    const delta = Math.min(rawDelta, 0.05);
    const time = state.clock.getElapsedTime();
    const posAttr = pointsRef.current.geometry.attributes.position;
    const count = posAttr.count;

    if (preset === "matrix_grid") {
      for (let i = 0; i < count; i++) {
        let y = posAttr.getY(i);
        y -= speed * delta * 3.5;
        if (y < -6) y = 6;
        posAttr.setY(i, y);
      }
      posAttr.needsUpdate = true;
    } else if (preset === "aurora") {
      for (let i = 0; i < count; i++) {
        const x = posAttr.getX(i);
        const z = posAttr.getZ(i);
        const originalY =
          Math.sin(x * 0.4 + time * speed * 0.8) * 1.5 +
          Math.cos(z * 0.3 + time * speed * 0.5) * 0.5;
        posAttr.setY(i, originalY);
      }
      posAttr.needsUpdate = true;
    } else {
      pointsRef.current.rotation.y = time * speed * 0.05;
      pointsRef.current.rotation.z = Math.sin(time * speed * 0.02) * 0.1;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.055}
        vertexColors
        transparent
        opacity={0.78}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

export default function RobotCanvas({
  customizer,
  gesture,
  isVideoActive,
  onStop,
}: RobotCanvasProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const wasActiveRef = useRef(false);
  const isSoftwareGl = useMemo(() => detectSoftwareWebGL(), []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isVideoActive) {
      if (!wasActiveRef.current) {
        video.currentTime = 0;
      }
      video.play().catch(() => {});
    } else {
      video.pause();
      video.currentTime = 0;
    }
    wasActiveRef.current = isVideoActive;
  }, [isVideoActive]);

  const bgColor = useMemo(() => {
    switch (customizer.environmentPreset) {
      case "matrix_grid":
        return "#020617";
      case "cyberpunk":
        return "#05050f";
      case "cosmos":
        return "#020205";
      case "aurora":
        return "#030712";
      default:
        return "#000000";
    }
  }, [customizer.environmentPreset]);

  return (
    <div className="w-full h-full relative" id="g3d_canvas_container">
      {/* Preloaded Video Overlay: loops when chat, TTS, or Live Voice starts; stops when stopped */}
      <div
        className={`absolute inset-0 z-30 bg-black flex items-center justify-center overflow-hidden transition-opacity duration-200 ${
          isVideoActive ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        <video
          ref={videoRef}
          src="/chat-video.mp4"
          preload="auto"
          loop
          muted
          playsInline
          className="w-full h-full object-cover"
        />
        {isVideoActive && onStop && (
          <button
            type="button"
            onClick={onStop}
            className="absolute bottom-5 right-5 font-mono text-[10px] font-black uppercase tracking-[0.12em] bg-[#ff4d00] text-white px-3.5 py-2 border-2 border-[#1a1a1a] shadow-[4px_4px_0_#1a1a1a] hover:translate-y-[-2px] hover:-translate-x-[2px] hover:shadow-[6px_6px_0_#1a1a1a] active:translate-y-0 active:translate-x-0 active:shadow-none transition-all cursor-pointer z-40"
          >
            ■ STOP CHAT / VOICE
          </button>
        )}
      </div>

      {/* Three.js Studio PBR Canvas */}
      <Canvas
        shadows={!isSoftwareGl}
        dpr={isSoftwareGl ? 1 : [1, 2]}
        camera={{ position: [0, 0.45, 2.55], fov: 45 }}
        gl={{
          antialias: !isSoftwareGl,
          powerPreference: "high-performance",
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.1,
          outputColorSpace: THREE.SRGBColorSpace,
        }}
        style={{ background: bgColor }}
      >
        <color attach="background" args={[bgColor]} />
        <fogExp2 attach="fog" args={[bgColor, 0.055]} />

        <StudioEnvironment />

        {/* Warm Key + Cool Hemisphere Fill + Rim Light */}
        <hemisphereLight args={["#93c5fd", "#1e293b", 0.65]} />
        <ambientLight
          color={customizer.ambientLightColor}
          intensity={customizer.ambientLightIntensity * 0.4}
        />

        <directionalLight
          position={[2.4, 4.2, 3.2]}
          color={customizer.directionalLightColor || "#fff3db"}
          intensity={customizer.directionalLightIntensity}
          castShadow={!isSoftwareGl}
          shadow-mapSize={[1024, 1024]}
          shadow-bias={-0.0005}
          shadow-normalBias={0.02}
        >
          <orthographicCamera attach="shadow-camera" args={[-2.2, 2.2, 2.2, -2.2, 0.5, 12]} />
        </directionalLight>

        <pointLight
          position={[-2.2, 1.4, -2.0]}
          color={customizer.robotAccentColor}
          intensity={1.1}
        />

        {/* Instanced 3D Arena Props */}
        <InstancedArenaProps
          preset={customizer.environmentPreset}
          accentColor={customizer.robotAccentColor}
          speed={customizer.particleSpeed}
        />

        {/* 3D Environment Particles */}
        <DynamicEnvironment
          preset={customizer.environmentPreset}
          particleCount={customizer.particleCount}
          speed={customizer.particleSpeed}
        />

        {customizer.environmentPreset === "cosmos" && (
          <Stars radius={100} depth={50} count={2000} factor={4} saturation={0.5} fade speed={1.2} />
        )}

        {/* Customizable 3D Grid (offset >= 0.02 below contact shadow) */}
        {customizer.showGrid && (
          <gridHelper
            args={[12, 24, customizer.robotAccentColor, "#1f2937"]}
            position={[0, -0.96, 0]}
          />
        )}

        {/* Procedural Radial Ground Contact Shadow */}
        <RadialGroundShadow />

        {/* Responsive 3D Kungfu Panda Model */}
        <group position={[0, -0.02, 0]}>
          <RobotModel customizer={customizer} gesture={gesture} isSoftwareGl={isSoftwareGl} />
        </group>

        <OrbitControls
          enableZoom
          enableDamping={!isSoftwareGl}
          dampingFactor={0.06}
          minDistance={1.5}
          maxDistance={5.5}
          maxPolarAngle={Math.PI / 2 + 0.1}
          minPolarAngle={0.2}
          autoRotate={!isSoftwareGl && gesture === "dance"}
          autoRotateSpeed={4.0}
          enablePan={false}
          rotateSpeed={customizer.rotateSpeed}
        />
      </Canvas>

      {/* Clean Static Overlay Tag (No backdrop-filter or pulsating dots over WebGL) */}
      <div className="absolute bottom-4 left-4 flex gap-2 items-center text-[10px] text-white font-mono bg-[#1a1a1a] px-3 py-1.5 border-2 border-white pointer-events-none select-none shadow-[3px_3px_0_#1a1a1a]">
        <span className="w-2 h-2 bg-[#ff4d00] inline-block"></span>
        <span>DRAG TO ROTATE // SCROLL TO ZOOM</span>
      </div>
    </div>
  );
}
