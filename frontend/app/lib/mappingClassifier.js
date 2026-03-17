export function classifyByMapping(rgb, contrast, mapping) {
  const entries = mapping?.entries || [];
  if (!entries.length) {
    return { label: "Unknown", color_group: "Unknown", thickness_nm: 0, confidence: 0 };
  }

  let best = entries[0];
  let bestScore = -1;
  for (const entry of entries) {
    const score = scoreEntry(rgb, contrast, entry);
    if (score > bestScore) {
      best = entry;
      bestScore = score;
    }
  }

  return {
    label: best.label,
    color_group: best.color_group || "Unknown",
    thickness_nm: best.thickness_nm,
    confidence: Math.max(0, Math.min(1, bestScore * best.confidence_hint)),
  };
}

function scoreEntry(rgb, contrast, entry) {
  const [r, g, b] = rgb;
  const color = entry.color_range;

  const sr = scoreChannel(r, color.r_min, color.r_max);
  const sg = scoreChannel(g, color.g_min, color.g_max);
  const sb = scoreChannel(b, color.b_min, color.b_max);
  const colorScore = (sr + sg + sb) / 3;

  const cMin = entry.contrast_range.min;
  const cMax = entry.contrast_range.max;
  const cSpan = Math.max(0.000001, cMax - cMin);

  let contrastScore;
  if (contrast >= cMin && contrast <= cMax) {
    const cCenter = (cMin + cMax) / 2;
    contrastScore = Math.max(0, 1 - Math.abs(contrast - cCenter) / (cSpan / 2 + 0.000001));
  } else {
    const dist = Math.min(Math.abs(contrast - cMin), Math.abs(contrast - cMax));
    contrastScore = Math.max(0, 1 - dist / Math.max(cSpan, 0.05));
  }

  return 0.6 * colorScore + 0.4 * contrastScore;
}

function scoreChannel(value, minValue, maxValue) {
  if (value >= minValue && value <= maxValue) {
    const center = (minValue + maxValue) / 2;
    const half = Math.max(1, (maxValue - minValue) / 2);
    return Math.max(0, 1 - Math.abs(value - center) / half);
  }
  const dist = Math.min(Math.abs(value - minValue), Math.abs(value - maxValue));
  return Math.max(0, 1 - dist / 255);
}

export function grayscaleIntensity(rgb) {
  return 0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2];
}
