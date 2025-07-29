// Advanced HBN Thickness Analysis Module
// Based on research data for hexagonal boron nitride optical properties

// HBN layer thickness data (in nanometers)
export const HBN_THICKNESS_DATA = {
  monolayer: { thickness: 0.33, range: [0.30, 0.36], name: 'Monolayer' },
  bilayer: { thickness: 0.66, range: [0.60, 0.72], name: 'Bilayer' },
  trilayer: { thickness: 1.0, range: [0.90, 1.10], name: 'Trilayer' },
  few: { thickness: 2.0, range: [1.3, 3.3], name: 'Few Layers' },
  bulk: { thickness: 5.0, range: [3.3, 20.0], name: 'Bulk' }
};

// Enhanced color analysis functions
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

export function rgbToLab(r, g, b) {
  // Convert RGB to XYZ
  r = r / 255; g = g / 255; b = b / 255;
  
  r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
  g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
  b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;
  
  const x = r * 0.4124 + g * 0.3576 + b * 0.1805;
  const y = r * 0.2126 + g * 0.7152 + b * 0.0722;
  const z = r * 0.0193 + g * 0.1192 + b * 0.9505;
  
  // Normalize
  const xn = x / 0.95047;
  const yn = y / 1.00000;
  const zn = z / 1.08883;
  
  const fx = xn > 0.008856 ? Math.pow(xn, 1/3) : (7.787 * xn + 16/116);
  const fy = yn > 0.008856 ? Math.pow(yn, 1/3) : (7.787 * yn + 16/116);
  const fz = zn > 0.008856 ? Math.pow(zn, 1/3) : (7.787 * zn + 16/116);
  
  const L = 116 * fy - 16;
  const a = 500 * (fx - fy);
  const b_lab = 200 * (fy - fz);
  
  return [L, a, b_lab];
}

export function isBackground(r, g, b, threshold = 240) {
  // Enhanced background detection
  const [h, s, l] = rgbToHsl(r, g, b);
  
  // High lightness and low saturation typically indicates background/substrate
  return (l > 85 && s < 15) || (r > threshold && g > threshold && b > threshold);
}

export function analyzeHBNThickness(r, g, b) {
  if (isBackground(r, g, b)) {
    return { 
      type: 'background', 
      thickness: 0, 
      confidence: 0,
      description: 'Substrate/Background'
    };
  }

  const [h, s, l] = rgbToHsl(r, g, b);
  const [L, a, b_lab] = rgbToLab(r, g, b);
  
  // Advanced HBN thickness analysis based on optical properties
  let bestMatch = null;
  let maxConfidence = 0;

  // Monolayer detection (very light blue, high transparency)
  if (h >= 180 && h <= 220 && s >= 10 && s <= 40 && l >= 70 && l <= 95) {
    const confidence = calculateConfidence(h, s, l, 200, 25, 85, [20, 30, 10]);
    if (confidence > maxConfidence) {
      bestMatch = { 
        type: 'monolayer', 
        thickness: HBN_THICKNESS_DATA.monolayer.thickness,
        confidence: confidence * 0.9, // Slightly lower due to detection difficulty
        description: `${HBN_THICKNESS_DATA.monolayer.name} (~${HBN_THICKNESS_DATA.monolayer.thickness}nm)`
      };
      maxConfidence = confidence;
    }
  }

  // Bilayer detection (light blue)
  if (h >= 190 && h <= 230 && s >= 20 && s <= 60 && l >= 60 && l <= 85) {
    const confidence = calculateConfidence(h, s, l, 210, 40, 72, [20, 20, 12]);
    if (confidence > maxConfidence) {
      bestMatch = { 
        type: 'bilayer', 
        thickness: HBN_THICKNESS_DATA.bilayer.thickness,
        confidence: confidence,
        description: `${HBN_THICKNESS_DATA.bilayer.name} (~${HBN_THICKNESS_DATA.bilayer.thickness}nm)`
      };
      maxConfidence = confidence;
    }
  }

  // Trilayer detection (blue)
  if (h >= 200 && h <= 250 && s >= 30 && s <= 70 && l >= 40 && l <= 75) {
    const confidence = calculateConfidence(h, s, l, 225, 50, 57, [25, 20, 17]);
    if (confidence > maxConfidence) {
      bestMatch = { 
        type: 'trilayer', 
        thickness: HBN_THICKNESS_DATA.trilayer.thickness,
        confidence: confidence,
        description: `${HBN_THICKNESS_DATA.trilayer.name} (~${HBN_THICKNESS_DATA.trilayer.thickness}nm)`
      };
      maxConfidence = confidence;
    }
  }

  // Few layers detection (blue to green transition)
  if ((h >= 160 && h <= 200 && s >= 25 && s <= 75 && l >= 30 && l <= 70) ||
      (h >= 210 && h <= 260 && s >= 35 && s <= 80 && l >= 25 && l <= 65)) {
    const avgThickness = (HBN_THICKNESS_DATA.few.range[0] + HBN_THICKNESS_DATA.few.range[1]) / 2;
    const confidence = calculateConfidence(h, s, l, 180, 50, 47, [40, 25, 20]);
    if (confidence > maxConfidence) {
      bestMatch = { 
        type: 'few', 
        thickness: avgThickness,
        confidence: confidence,
        description: `${HBN_THICKNESS_DATA.few.name} (~${avgThickness.toFixed(1)}nm)`
      };
      maxConfidence = confidence;
    }
  }

  // Bulk detection (yellow to white)
  if ((h >= 40 && h <= 80 && s >= 20 && s <= 80 && l >= 50 && l <= 90) ||
      (l >= 80 && s >= 5 && s <= 30)) {
    const confidence = calculateConfidence(h, s, l, 60, 50, 70, [40, 30, 20]);
    if (confidence > maxConfidence) {
      bestMatch = { 
        type: 'bulk', 
        thickness: HBN_THICKNESS_DATA.bulk.thickness,
        confidence: confidence,
        description: `${HBN_THICKNESS_DATA.bulk.name} (>${HBN_THICKNESS_DATA.bulk.range[0]}nm)`
      };
      maxConfidence = confidence;
    }
  }

  // If no clear match, provide best estimate based on color properties
  if (!bestMatch || maxConfidence < 0.3) {
    return estimateThicknessFromColor(h, s, l);
  }

  return bestMatch;
}

function calculateConfidence(h, s, l, targetH, targetS, targetL, tolerances) {
  const [hTol, sTol, lTol] = tolerances;
  const hDiff = Math.min(Math.abs(h - targetH), 360 - Math.abs(h - targetH));
  const sDiff = Math.abs(s - targetS);
  const lDiff = Math.abs(l - targetL);
  
  const hConf = Math.max(0, 1 - hDiff / hTol);
  const sConf = Math.max(0, 1 - sDiff / sTol);
  const lConf = Math.max(0, 1 - lDiff / lTol);
  
  return (hConf * sConf * lConf) ** 0.5; // Geometric mean for balanced weighting
}

function estimateThicknessFromColor(h, s, l) {
  // Fallback estimation based on general color trends
  if (l > 80) {
    return { 
      type: 'unknown', 
      thickness: 0.2, 
      confidence: 0.2,
      description: 'Very thin layer (estimated)'
    };
  } else if (h >= 180 && h <= 260 && l > 50) {
    return { 
      type: 'unknown', 
      thickness: 1.5, 
      confidence: 0.3,
      description: 'Thin layer (estimated)'
    };
  } else if (h >= 40 && h <= 80) {
    return { 
      type: 'unknown', 
      thickness: 4.0, 
      confidence: 0.25,
      description: 'Thick layer (estimated)'
    };
  }
  
  return { 
    type: 'unknown', 
    thickness: 0, 
    confidence: 0,
    description: 'Material not identified'
  };
}

export function filterByLayerType(imageData, filterType) {
  const { data, width, height } = imageData;
  const out = new Uint8ClampedArray(data);
  
  for (let i = 0; i < data.length; i += 4) {
    const [r, g, b] = [data[i], data[i+1], data[i+2]];
    const analysis = analyzeHBNThickness(r, g, b);
    
    const shouldShow = filterType === 'all' || 
                      analysis.type === filterType ||
                      (filterType === 'background' && isBackground(r, g, b));
    
    if (!shouldShow) {
      out[i+3] = 0; // Make transparent
    }
  }
  
  return new ImageData(out, width, height);
}

// Legacy compatibility functions
export function getShade(r, g, b) {
  const analysis = analyzeHBNThickness(r, g, b);
  return analysis.type;
}

export function filterParticlesByColor(imageData, filter) {
  return filterByLayerType(imageData, filter);
}