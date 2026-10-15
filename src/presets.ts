/** Spread a preset into either renderer; each lever remains independently adjustable. */
export const wireframePresets = {
  default: { density: 0.5, intensity: 0.25, contrast: 0.5, duration: 3600 },
  sparse: { density: 0.5, intensity: 0.25, duration: 1800 },
  reference: { density: 1, intensity: 1, duration: 2600 },
  overdrive: { density: 2, intensity: 3, duration: 3000 },
} as const;
