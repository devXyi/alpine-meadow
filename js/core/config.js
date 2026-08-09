// Static configuration: world layout and render-quality presets.
// Nothing in this file changes at runtime.

export const QUALITY = {
  low:    { grass: 7000,  flowersPer: 42,  trees: 18, fireflies: 30, weather: 220, stars: 300, shadowRes: 512,  birds: 5,  fish: 4, rabbits: 4, rocks: 120, shrubs: 160, reeds: 50, stones: 45 },
  medium: { grass: 18000, flowersPer: 75,  trees: 24, fireflies: 52, weather: 420, stars: 520, shadowRes: 1024, birds: 7,  fish: 5, rabbits: 5, rocks: 220, shrubs: 300, reeds: 90, stones: 75 },
  high:   { grass: 36000, flowersPer: 115, trees: 34, fireflies: 82, weather: 680, stars: 850, shadowRes: 2048, birds: 10, fish: 7, rabbits: 8, rocks: 360, shrubs: 500, reeds: 140, stones: 115 }
};

export const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || window.innerWidth < 820;

function getQualityLevel() {
  const m = location.hash.match(/quality=(low|medium|high)/);
  return m ? m[1] : (isMobile ? 'medium' : 'high');
}

export const qualityLevel = getQualityLevel();
export const quality = QUALITY[qualityLevel];

export const fieldExtent = 100;
export const groundMeshSize = 460;
export const groundSegments = 190;

export const spawn = { x: 0, z: 16 };
export const lake = { x: 14, z: -10, radius: 8.5, y: -0.9 };

// Story-rich village layout. Each home is intentionally different so the
// skyline feels like a small alpine settlement rather than repeated boxes.
export const houseConfigs = [
  { x: -15, z: 8,   wall: 0xead9b3, roof: 0x8a3f2e, stories: 3, scale: 1.00 },
  { x: -24, z: -8,  wall: 0xcf9569, roof: 0x5c4433, stories: 4, scale: 1.05 },
  { x: -7,  z: -24, wall: 0xc9d3d1, roof: 0x6b4a3a, stories: 5, scale: 0.95 },
  { x: 20,  z: 12,  wall: 0xd8c4a2, roof: 0x704437, stories: 4, scale: 1.10 },
  { x: 31,  z: -4,  wall: 0xb9c7bd, roof: 0x4e5a52, stories: 3, scale: 1.00 },
  { x: 25,  z: -24, wall: 0xe0b88d, roof: 0x704235, stories: 5, scale: 0.92 }
];

export const HOUSE_HALF = 4.0;
export const pathPoints = [[0, 16], [-3, 7], [-9, 1], [-14.5, -2.5], [-19, -6.5], [-13, -18], [-3, -24]];
