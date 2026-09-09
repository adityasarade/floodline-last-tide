export type PixelFrame = { width: number; height: number; data: Uint8ClampedArray };
export type NightprintZone = { id: 'market' | 'wall' | 'sail'; changed: number; coverage: number; signal: number; message: string };
export type NightprintReport = { modified: boolean; totalCoverage: number; zones: NightprintZone[] };

const ZONE_IDS = ['market', 'wall', 'sail'] as const;

function colorDistance(a: Uint8ClampedArray, ai: number, b: Uint8ClampedArray, bi: number) {
  return Math.abs(a[ai] - b[bi]) + Math.abs(a[ai + 1] - b[bi + 1]) + Math.abs(a[ai + 2] - b[bi + 2]);
}

function statusFor(signal: number) {
  if (signal >= 76) return 'FULL GLOW';
  if (signal >= 36) return 'LIT';
  if (signal >= 7) return 'A QUIET SIGNAL';
  return 'INK ONLY';
}

export function analyzeNightprint(original: PixelFrame, edited: PixelFrame): NightprintReport {
  if (original.width !== edited.width || original.height !== edited.height) throw new Error('Print frames are different sizes.');
  const width = original.width; const height = original.height;
  const counts = [0, 0, 0]; const samples = [0, 0, 0]; let changedTotal = 0; let sampleTotal = 0;
  // Sampling every other pixel removes normal JPEG texture from the returned editor export.
  for (let y = 2; y < height - 2; y += 2) for (let x = 2; x < width - 2; x += 2) {
    const index = (y * width + x) * 4; const zone = Math.min(2, Math.floor(x / (width / 3)));
    samples[zone] += 1; sampleTotal += 1;
    if (colorDistance(original.data, index, edited.data, index) > 84) { counts[zone] += 1; changedTotal += 1; }
  }
  const zones = ZONE_IDS.map((id, index) => {
    const coverage = Math.round((counts[index] / Math.max(1, samples[index])) * 1000) / 10;
    // The response rewards a visible creative gesture without requiring a user to paint the whole source image.
    const signal = Math.min(100, Math.round(Math.sqrt(coverage / 100) * 360));
    return { id, changed: counts[index], coverage, signal, message: statusFor(signal) };
  });
  const totalCoverage = Math.round((changedTotal / Math.max(1, sampleTotal)) * 1000) / 10;
  return { modified: totalCoverage >= .08, totalCoverage, zones };
}
