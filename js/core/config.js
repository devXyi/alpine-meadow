// Static configuration: world layout and render-quality presets.
// Nothing in this file changes at runtime.

export const QUALITY = {
  low:    { grass: 3200,  flowersPer: 30, trees: 14, fireflies: 24, weather: 200, stars: 260, shadowRes: 512,  birds: 4, fish: 3, rabbits: 3 },
  medium: { grass: 6500,  flowersPer: 55, trees: 20, fireflies: 44, weather: 380, stars: 460, shadowRes: 1024, birds: 6, fish: 4, rabbits: 4 },
  high:   { grass: 13000, flowersPer: 85, trees: 28, fireflies: 70, weather: 600, stars: 700, shadowRes: 2048, birds: 8, fish: 5, rabbits: 6 }
};

export const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || window.innerWidth < 820;

function getQualityLevel() {
  const m = location.hash.match(/quality=(low|medium|high)/);
  return m ? m[1] : (isMobile ? 'medium' : 'high');
}

export const qualityLevel = getQualityLevel();
export const quality = QUALITY[qualityLevel];

// World size. fieldExtent is the walkable/content radius; groundMeshSize is
// deliberately larger so the ground plane's edge stays hidden in fog.
export const fieldExtent = 100;
export const groundMeshSize = 460;
export const groundSegments = 130;

export const spawn = { x: 0, z: 16 };
export const lake = { x: 14, z: -10, radius: 8.5, y: -0.9 };
export const houseConfigs = [
  { x: -15, z: 8,   wall: 0xead9b3, roof: 0x8a3f2e },
  { x: -22, z: -8,  wall: 0xcf9569, roof: 0x5c4433 },
  { x: -7,  z: -22, wall: 0xc9d3d1, roof: 0x6b4a3a }
];
export const HOUSE_HALF = 2.4;
export const pathPoints = [[0, 16], [-3, 7], [-9, 1], [-14.5, -2.5], [-19, -6.5]];

