/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Message {
  id: string;
  role: "user" | "model";
  text: string;
  gesture?: "idle" | "wave" | "happy" | "thinking" | "nod" | "surprise" | "dance";
  timestamp: string;
}

export type MaterialPreset = "metallic" | "holographic" | "matte" | "glow_neon";
export type EnvironmentPreset = "matrix_grid" | "cyberpunk" | "cosmos" | "aurora";
export type AccessoryType = "none" | "antenna" | "floating_ring" | "cyber_ears";

export interface CustomizerState {
  // Robot Customization
  robotMaterialPreset: MaterialPreset;
  robotBaseColor: string;
  robotAccentColor: string;
  robotScreenColor: string;
  robotMetallic: number;
  robotRoughness: number;
  accessory: AccessoryType;
  
  // Scene Customization
  environmentPreset: EnvironmentPreset;
  ambientLightColor: string;
  ambientLightIntensity: number;
  directionalLightColor: string;
  directionalLightIntensity: number;
  particleCount: number;
  particleSpeed: number;
  rotateSpeed: number;

  // UI / Chat Bubble Styling
  bubbleOpacity: number;
  bubbleRoughness: number;
  bubbleGlassColor: string;
  showGrid: boolean;
  perspectiveStrength: number; // For 3D interaction strength
}

export const DEFAULT_CUSTOMIZER_STATE: CustomizerState = {
  robotMaterialPreset: "matte",
  robotBaseColor: "#d97706", // Golden-brown shorts
  robotAccentColor: "#ef4444", // Red sash waistband
  robotScreenColor: "#10b981", // Glowing jade eyes
  robotMetallic: 0.05,
  robotRoughness: 0.9,
  accessory: "cyber_ears", // Straw hat
  
  environmentPreset: "aurora", // Jade Palace Aurora
  ambientLightColor: "#0f172a",
  ambientLightIntensity: 1.2,
  directionalLightColor: "#10b981", // Jade green light
  directionalLightIntensity: 1.8,
  particleCount: 1200,
  particleSpeed: 0.5,
  rotateSpeed: 0.3,

  bubbleOpacity: 0.3,
  bubbleRoughness: 0.2,
  bubbleGlassColor: "#ffffff",
  showGrid: true,
  perspectiveStrength: 1.0,
};
