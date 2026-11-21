/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Sliders, Palette, ShieldAlert, Sun, Orbit, Sparkles, RefreshCw, LayoutGrid } from "lucide-react";
import { CustomizerState, MaterialPreset, EnvironmentPreset, AccessoryType, DEFAULT_CUSTOMIZER_STATE } from "../types";

interface CustomizerPanelProps {
  customizer: CustomizerState;
  onChange: (updater: (prev: CustomizerState) => CustomizerState) => void;
  onReset: () => void;
}

// Neo-Brutalist button component helper
function TactileButton({
  children,
  onClick,
  active = false,
  color = "indigo",
  className = "",
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  color?: "indigo" | "emerald" | "cyan" | "violet" | "slate" | "rose";
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`font-mono text-[10px] font-bold uppercase tracking-wider py-2.5 px-3 border-2 border-[#1a1a1a] transition-all duration-75 cursor-pointer ${
        active
          ? "bg-[#1a1a1a] text-white shadow-none translate-y-[1px] translate-x-[1px]"
          : color === "rose"
            ? "bg-[#ff4d00] text-white hover:bg-[#ef4444] shadow-[2px_2px_0_#1a1a1a] hover:translate-y-[-1px] hover:-translate-x-[1px] hover:shadow-[3px_3px_0_#1a1a1a] active:translate-y-0 active:shadow-none"
            : "bg-white text-[#1a1a1a] hover:bg-[#f2efeb] shadow-[2px_2px_0_#1a1a1a] hover:translate-y-[-1px] hover:-translate-x-[1px] hover:shadow-[3px_3px_0_#1a1a1a] active:translate-y-0 active:shadow-none"
      } ${className}`}
    >
      {children}
    </button>
  );
}

export default function CustomizerPanel({ customizer, onChange, onReset }: CustomizerPanelProps) {
  // Preset palettes for rapid 3D coloring
  const baseColorPresets = [
    { value: "#3b82f6", label: "Sky Blue" },
    { value: "#ef4444", label: "Crimson" },
    { value: "#10b981", label: "Emerald" },
    { value: "#f59e0b", label: "Amber" },
    { value: "#ec4899", label: "Hot Pink" },
    { value: "#ffffff", label: "Pure White" },
    { value: "#1e293b", label: "Gunmetal" },
  ];

  const accentColorPresets = [
    { value: "#10b981", label: "Cyber Emerald" },
    { value: "#06b6d4", label: "Neon Cyan" },
    { value: "#a855f7", label: "Hyper Violet" },
    { value: "#f43f5e", label: "Laser Rose" },
    { value: "#eab308", label: "Volt Yellow" },
    { value: "#f97316", label: "Solar Orange" },
  ];

  const screenColorPresets = [
    { value: "#06b6d4", label: "Tech Cyan" },
    { value: "#22c55e", label: "Matrix Green" },
    { value: "#ec4899", label: "Plasma Pink" },
    { value: "#eab308", label: "Active Yellow" },
    { value: "#ffffff", label: "White Light" },
  ];

  return (
    <div className="flex flex-col h-full bg-white text-[#1a1a1a] overflow-y-auto custom-scrollbar select-none">
      {/* Panel Header */}
      <div className="p-5 border-b-[3px] border-[#1a1a1a] flex items-center justify-between bg-[#f2efeb] shrink-0">
        <div className="flex items-center gap-2">
          <Palette className="w-5 h-5 text-[#ff4d00]" />
          <h2 className="text-xs font-gothic font-black tracking-[0.2em] uppercase text-[#1a1a1a]">Po Personalizer</h2>
        </div>
        {/* Reset Button */}
        <TactileButton onClick={onReset} color="rose" className="px-3.5 py-1.5 text-[9px]">
          <span className="flex items-center gap-1 justify-center">
            <RefreshCw className="w-3 h-3" />
            Reset
          </span>
        </TactileButton>
      </div>

      <div className="p-5 space-y-6">
        {/* SECTION 1: MATERIALS */}
        <div className="space-y-3">
          <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-[#1a1a1a]/60">
            <Sparkles className="w-3.5 h-3.5 text-[#ff4d00]" />
            <span>Panda Material Finish</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <TactileButton
              active={customizer.robotMaterialPreset === "metallic"}
              onClick={() =>
                onChange((prev) => ({
                  ...prev,
                  robotMaterialPreset: "metallic",
                  robotMetallic: 0.9,
                  robotRoughness: 0.1,
                }))
              }
              color="indigo"
            >
              🔩 Chrome armor
            </TactileButton>
            <TactileButton
              active={customizer.robotMaterialPreset === "holographic"}
              onClick={() =>
                onChange((prev) => ({
                  ...prev,
                  robotMaterialPreset: "holographic",
                  robotMetallic: 0.1,
                  robotRoughness: 0.15,
                }))
              }
              color="cyan"
            >
              🔮 Holographic Jade
            </TactileButton>
            <TactileButton
              active={customizer.robotMaterialPreset === "matte"}
              onClick={() =>
                onChange((prev) => ({
                  ...prev,
                  robotMaterialPreset: "matte",
                  robotMetallic: 0.1,
                  robotRoughness: 0.8,
                }))
              }
              color="slate"
            >
              🐼 Soft Fluffy Fur
            </TactileButton>
            <TactileButton
              active={customizer.robotMaterialPreset === "glow_neon"}
              onClick={() =>
                onChange((prev) => ({
                  ...prev,
                  robotMaterialPreset: "glow_neon",
                  robotMetallic: 0.8,
                  robotRoughness: 0.3,
                }))
              }
              color="emerald"
            >
              ⚡ Glowing Neon Chi
            </TactileButton>
          </div>
        </div>

        {/* SECTION 2: ACCESSORIES */}
        <div className="space-y-3">
          <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-[#1a1a1a]/60">
            <LayoutGrid className="w-3.5 h-3.5 text-[#ff4d00]" />
            <span>Warrior Accessories</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <TactileButton
              active={customizer.accessory === "none"}
              onClick={() => onChange((prev) => ({ ...prev, accessory: "none" }))}
              color="slate"
            >
              🚫 Traditional Po
            </TactileButton>
            <TactileButton
              active={customizer.accessory === "antenna"}
              onClick={() => onChange((prev) => ({ ...prev, accessory: "antenna" }))}
              color="violet"
            >
              🎋 Bamboo Staff
            </TactileButton>
            <TactileButton
              active={customizer.accessory === "cyber_ears"}
              onClick={() => onChange((prev) => ({ ...prev, accessory: "cyber_ears" }))}
              color="indigo"
            >
              👒 Straw Hat
            </TactileButton>
            <TactileButton
              active={customizer.accessory === "floating_ring"}
              onClick={() => onChange((prev) => ({ ...prev, accessory: "floating_ring" }))}
              color="cyan"
            >
              🪐 Golden Chi Ring
            </TactileButton>
          </div>
        </div>

        {/* SECTION 3: BASE CHASSIS COLORS */}
        <div className="space-y-3">
          <div className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-[#1a1a1a]/60">Shorts / Pants Color</div>
          <div className="flex flex-wrap gap-2.5">
            {baseColorPresets.map((preset) => (
              <button
                key={preset.value}
                title={preset.label}
                onClick={() => onChange((prev) => ({ ...prev, robotBaseColor: preset.value }))}
                style={{ backgroundColor: preset.value }}
                className={`w-8 h-8 rounded-full border-2 cursor-pointer transition-all duration-75 hover:scale-105 active:scale-95 ${
                  customizer.robotBaseColor === preset.value
                    ? "border-4 border-[#1a1a1a] scale-110 shadow-[2px_2px_0_#1a1a1a]"
                    : "border-2 border-[#1a1a1a]/40 hover:border-[#1a1a1a]"
                }`}
              ></button>
            ))}
          </div>
        </div>

        {/* ACCENT NEON COLORS */}
        <div className="space-y-3">
          <div className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-[#1a1a1a]/60">Sash & Highlights Color</div>
          <div className="flex flex-wrap gap-2.5">
            {accentColorPresets.map((preset) => (
              <button
                key={preset.value}
                title={preset.label}
                onClick={() => onChange((prev) => ({ ...prev, robotAccentColor: preset.value }))}
                style={{ backgroundColor: preset.value }}
                className={`w-8 h-8 rounded-full border-2 cursor-pointer transition-all duration-75 hover:scale-105 active:scale-95 ${
                  customizer.robotAccentColor === preset.value
                    ? "border-4 border-[#1a1a1a] scale-110 shadow-[2px_2px_0_#1a1a1a]"
                    : "border-2 border-[#1a1a1a]/40 hover:border-[#1a1a1a]"
                }`}
              ></button>
            ))}
          </div>
        </div>

        {/* SCREEN EYE COLOR */}
        <div className="space-y-3">
          <div className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-[#1a1a1a]/60">Glowing Jade Eyes Color</div>
          <div className="flex flex-wrap gap-2.5">
            {screenColorPresets.map((preset) => (
              <button
                key={preset.value}
                title={preset.label}
                onClick={() => onChange((prev) => ({ ...prev, robotScreenColor: preset.value }))}
                style={{ backgroundColor: preset.value }}
                className={`w-8 h-8 rounded-full border-2 cursor-pointer transition-all duration-75 hover:scale-105 active:scale-95 ${
                  customizer.robotScreenColor === preset.value
                    ? "border-4 border-[#1a1a1a] scale-110 shadow-[2px_2px_0_#1a1a1a]"
                    : "border-2 border-[#1a1a1a]/40 hover:border-[#1a1a1a]"
                }`}
              ></button>
            ))}
          </div>
        </div>

        {/* SECTION 4: ENVIRONMENT SHADERS */}
        <div className="space-y-3 border-t-2 border-[#1a1a1a]/10 pt-5">
          <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-[#1a1a1a]/60">
            <Orbit className="w-3.5 h-3.5 text-[#ff4d00]" />
            <span>Virtual Environment</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <TactileButton
              active={customizer.environmentPreset === "cyberpunk"}
              onClick={() =>
                onChange((prev) => ({
                  ...prev,
                  environmentPreset: "cyberpunk",
                  ambientLightColor: "#1e1b4b",
                  directionalLightColor: "#f43f5e",
                  directionalLightIntensity: 1.8,
                }))
              }
              color="rose"
            >
              🌆 Cyberpunk Arena
            </TactileButton>
            <TactileButton
              active={customizer.environmentPreset === "cosmos"}
              onClick={() =>
                onChange((prev) => ({
                  ...prev,
                  environmentPreset: "cosmos",
                  ambientLightColor: "#020617",
                  directionalLightColor: "#c084fc",
                  directionalLightIntensity: 1.2,
                }))
              }
              color="indigo"
            >
              🌌 Deep Cosmos
            </TactileButton>
            <TactileButton
              active={customizer.environmentPreset === "matrix_grid"}
              onClick={() =>
                onChange((prev) => ({
                  ...prev,
                  environmentPreset: "matrix_grid",
                  ambientLightColor: "#051e0f",
                  directionalLightColor: "#10b981",
                  directionalLightIntensity: 1.5,
                }))
              }
              color="emerald"
            >
              🌿 Jade Training Matrix
            </TactileButton>
            <TactileButton
              active={customizer.environmentPreset === "aurora"}
              onClick={() =>
                onChange((prev) => ({
                  ...prev,
                  environmentPreset: "aurora",
                  ambientLightColor: "#021c1e",
                  directionalLightColor: "#2dd4bf",
                  directionalLightIntensity: 1.6,
                }))
              }
              color="cyan"
            >
              🍃 Jade Palace Aurora
            </TactileButton>
          </div>
        </div>

        {/* SECTION 5: SLIDERS & CONTROLS */}
        <div className="space-y-4 border-t-2 border-[#1a1a1a]/10 pt-5">
          <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-[#1a1a1a]/60">
            <Sliders className="w-3.5 h-3.5 text-[#ff4d00]" />
            <span>Fur & Skin Finish Settings</span>
          </div>

          {/* Roughness */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px] font-bold uppercase tracking-wider text-[#1a1a1a]/70">
              <span>Surface Roughness</span>
              <span className="text-[#ff4d00] font-black">{(customizer.robotRoughness * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0.01"
              max="1"
              step="0.05"
              value={customizer.robotRoughness}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                onChange((prev) => ({ ...prev, robotRoughness: val }));
              }}
              className="w-full h-2 bg-[#f0f0f0] border-2 border-[#1a1a1a] appearance-none accent-[#ff4d00] cursor-pointer"
            />
          </div>

          {/* Metalness */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px] font-bold uppercase tracking-wider text-[#1a1a1a]/70">
              <span>Metallic Reflectance</span>
              <span className="text-[#ff4d00] font-black">{(customizer.robotMetallic * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={customizer.robotMetallic}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                onChange((prev) => ({ ...prev, robotMetallic: val }));
              }}
              className="w-full h-2 bg-[#f0f0f0] border-2 border-[#1a1a1a] appearance-none accent-[#ff4d00] cursor-pointer"
            />
          </div>
        </div>

        {/* SECTION 6: ATMOSPHERIC INTENSITIES */}
        <div className="space-y-4 border-t-2 border-[#1a1a1a]/10 pt-5">
          <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-[#1a1a1a]/60">
            <Sun className="w-3.5 h-3.5 text-[#ff4d00]" />
            <span>Atmosphere Constants</span>
          </div>

          {/* Particle Count */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px] font-bold uppercase tracking-wider text-[#1a1a1a]/70">
              <span>Quantum Dust Particles</span>
              <span className="text-[#ff4d00] font-black">{customizer.particleCount}</span>
            </div>
            <input
              type="range"
              min="100"
              max="3000"
              step="100"
              value={customizer.particleCount}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                onChange((prev) => ({ ...prev, particleCount: val }));
              }}
              className="w-full h-2 bg-[#f0f0f0] border-2 border-[#1a1a1a] appearance-none accent-[#ff4d00] cursor-pointer"
            />
          </div>

          {/* Rotation Speed */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px] font-bold uppercase tracking-wider text-[#1a1a1a]/70">
              <span>3D Interaction Drag Slower</span>
              <span className="text-[#ff4d00] font-black">{(customizer.rotateSpeed * 10).toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="1.5"
              step="0.1"
              value={customizer.rotateSpeed}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                onChange((prev) => ({ ...prev, rotateSpeed: val }));
              }}
              className="w-full h-2 bg-[#f0f0f0] border-2 border-[#1a1a1a] appearance-none accent-[#ff4d00] cursor-pointer"
            />
          </div>

          {/* Grid Toggle */}
          <div className="flex items-center justify-between border-2 border-[#1a1a1a] bg-[#f2efeb] p-3 shadow-[3px_3px_0_#1a1a1a]">
            <div className="flex flex-col">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#1a1a1a]">Render Ground Grid</span>
              <span className="text-[9px] text-[#1a1a1a]/60 font-mono">Enables spatial perspective lines</span>
            </div>
            <input
              type="checkbox"
              checked={customizer.showGrid}
              onChange={(e) => {
                const val = e.target.checked;
                onChange((prev) => ({ ...prev, showGrid: val }));
              }}
              className="w-4 h-4 text-[#ff4d00] border-2 border-[#1a1a1a] rounded-none focus:ring-[#ff4d00] cursor-pointer"
            />
          </div>
        </div>

        {/* SECTION 7: CHAT INTERACTIVE PERSPECTIVE */}
        <div className="space-y-4 border-t-2 border-[#1a1a1a]/10 pt-5">
          <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-[#1a1a1a]/60">
            <Sliders className="w-3.5 h-3.5 text-[#ff4d00]" />
            <span>3D Interactive Chat Bubbles</span>
          </div>

          {/* Glass Opacity */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px] font-bold uppercase tracking-wider text-[#1a1a1a]/70">
              <span>Bubble Glass Opacity</span>
              <span className="text-[#ff4d00] font-black">{(customizer.bubbleOpacity * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0.05"
              max="0.8"
              step="0.05"
              value={customizer.bubbleOpacity}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                onChange((prev) => ({ ...prev, bubbleOpacity: val }));
              }}
              className="w-full h-2 bg-[#f0f0f0] border-2 border-[#1a1a1a] appearance-none accent-[#ff4d00] cursor-pointer"
            />
          </div>

          {/* Perspective Strength */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px] font-bold uppercase tracking-wider text-[#1a1a1a]/70">
              <span>3D Bubble Tilt Strength</span>
              <span className="text-[#ff4d00] font-black">{(customizer.perspectiveStrength * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={customizer.perspectiveStrength}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                onChange((prev) => ({ ...prev, perspectiveStrength: val }));
              }}
              className="w-full h-2 bg-[#f0f0f0] border-2 border-[#1a1a1a] appearance-none accent-[#ff4d00] cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
