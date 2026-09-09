import { describe, expect, it } from 'vitest';
import { analyzeNightprint, type PixelFrame } from './afterglow';

function frame(value = 30): PixelFrame { return { width: 12, height: 6, data: new Uint8ClampedArray(12 * 6 * 4).fill(value) }; }

describe('analyzeNightprint', () => {
  it('does not call an identical export a change', () => {
    const original = frame(); expect(analyzeNightprint(original, frame()).modified).toBe(false);
  });
  it('attributes visible changes to their print third', () => {
    const original = frame(); const edited = frame();
    for (let y = 2; y < 4; y += 1) for (let x = 8; x < 10; x += 1) { const index = (y * 12 + x) * 4; edited.data[index] = 255; edited.data[index + 1] = 180; edited.data[index + 2] = 100; }
    const report = analyzeNightprint(original, edited);
    expect(report.modified).toBe(true); expect(report.zones[2].coverage).toBeGreaterThan(0); expect(report.zones[0].coverage).toBe(0);
  });
});
