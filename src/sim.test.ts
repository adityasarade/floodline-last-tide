import { describe, expect, it } from 'vitest';
import { MAP_HEIGHT, MAP_WIDTH, analyzeFlood, type PixelFrame } from './sim';

function frame(): PixelFrame {
  const data = new Uint8ClampedArray(MAP_WIDTH * MAP_HEIGHT * 4);
  for (let index = 3; index < data.length; index += 4) data[index] = 255;
  return { width: MAP_WIDTH, height: MAP_HEIGHT, data };
}

function paint(frameToEdit: PixelFrame, left: number, top: number, width: number, height: number) {
  for (let y = top; y < top + height; y += 1) for (let x = left; x < left + width; x += 1) {
    const offset = (y * MAP_WIDTH + x) * 4;
    frameToEdit.data[offset] = 238; frameToEdit.data[offset + 1] = 106; frameToEdit.data[offset + 2] = 79;
  }
}

function seal(edited: PixelFrame, top: number) {
  paint(edited, 450, top - 5, 12, 150);
}

describe('analyzeFlood', () => {
  it('does not construct a wall when the export has no visible pixel changes', () => {
    const original = frame();
    const report = analyzeFlood(original, frame());
    expect(report.modified).toBe(false);
    expect(report.wallMeters).toBe(0);
  });

  it('converts three saved gate strokes into a valid full city hold', () => {
    const original = frame(); const edited = frame();
    seal(edited, 145); seal(edited, 430); seal(edited, 715);
    const report = analyzeFlood(original, edited);
    expect(report.valid).toBe(true);
    expect(report.gates.every((gate) => gate.sealed)).toBe(true);
    expect(report.assets.every((asset) => asset.dry)).toBe(true);
    expect(report.structures).toBe(3);
    expect(report.wallMeters).toBeLessThanOrEqual(1450);
    expect(report.title).toBe('SECOND SHORELINE.');
  });

  it('floods only the unsealed sectors', () => {
    const original = frame(); const edited = frame();
    seal(edited, 145);
    const report = analyzeFlood(original, edited);
    expect(report.gates.filter((gate) => gate.sealed)).toHaveLength(1);
    expect(report.assets.filter((asset) => asset.dry).map((asset) => asset.id)).toEqual(['clinic', 'plant']);
    expect(report.assets.filter((asset) => !asset.dry)).toHaveLength(3);
  });

  it('rejects more than three disconnected construction structures', () => {
    const original = frame(); const edited = frame();
    paint(edited, 500, 100, 12, 12); paint(edited, 700, 300, 12, 12);
    paint(edited, 900, 500, 12, 12); paint(edited, 1100, 700, 12, 12);
    const report = analyzeFlood(original, edited);
    expect(report.structures).toBe(4);
    expect(report.valid).toBe(false);
  });
});
