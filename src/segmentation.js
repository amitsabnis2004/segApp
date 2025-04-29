// Segmentation utilities: background removal, shade‐based classification, filtering.

export function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h *= 60;
  }
  return [h, s * 100, l * 100];
}

export function isBackground(r, g, b, threshold = 240) {
  // assume white/bright background
  return r > threshold && g > threshold && b > threshold;
}

export function getShade(r, g, b) {
  const [h, , l] = rgbToHsl(r, g, b);
  let group;
  if (h >= 200 && h < 260) group = 'blue';
  else if (h >= 80 && h < 160) group = 'green';
  else if (h >= 40 && h < 80) group = 'yellow';
  else return 'other';
  const shadeNum = l < 33 ? 1 : l < 66 ? 2 : 3;
  return `${group}${shadeNum}`;   // e.g. "blue2"
}

export function filterParticlesByColor(imageData, filter) {
  const { data, width, height } = imageData;
  const out = new Uint8ClampedArray(data);
  for (let i = 0; i < data.length; i += 4) {
    const [r, g, b] = [data[i], data[i+1], data[i+2]];
    const bg = isBackground(r, g, b);
    const shade = getShade(r, g, b);
    const keep =
      filter === 'all' ||
      (shade === 'other' && filter === 'other') ||
      shade.startsWith(filter);
    if (bg || !keep) out[i+3] = 0;  // transparent
  }
  return new ImageData(out, width, height);
}