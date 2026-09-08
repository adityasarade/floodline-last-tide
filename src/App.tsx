import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ImageEditor, { type ImageEditorRef, type ImageEditorSaveResult } from '@unlayer/react-image-editor';
import { ASSETS, CELL, COLS, MAP_HEIGHT, MAP_WIDTH, MATERIAL_BUDGET, MAX_STRUCTURES, ROWS, analyzeFlood, type FloodReport, type PixelFrame } from './sim';

const MAP_SOURCE = '/map/floodline-sheet.png';
type Phase = 'brief' | 'edit' | 'scan' | 'replay';

function loadFrame(source: string): Promise<PixelFrame> {
  return new Promise((resolve, reject) => {
    const image = new Image(); image.decoding = 'async';
    image.onload = () => {
      const canvas = document.createElement('canvas'); canvas.width = MAP_WIDTH; canvas.height = MAP_HEIGHT;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) { reject(new Error('The tide desk could not open a canvas.')); return; }
      context.drawImage(image, 0, 0, MAP_WIDTH, MAP_HEIGHT);
      try { resolve({ width: MAP_WIDTH, height: MAP_HEIGHT, data: context.getImageData(0, 0, MAP_WIDTH, MAP_HEIGHT).data }); }
      catch { reject(new Error('The saved construction sheet cannot be read.')); }
    };
    image.onerror = () => reject(new Error('Morrow Bay’s construction sheet could not load.'));
    image.src = source;
  });
}

function TideOverlay({ report, progress }: { report: FloodReport; progress: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    canvas.width = MAP_WIDTH; canvas.height = MAP_HEIGHT;
    const context = canvas.getContext('2d'); if (!context) return;
    context.clearRect(0, 0, MAP_WIDTH, MAP_HEIGHT);
    const threshold = Math.max(0, Math.round(Math.max(report.maxDistance, 20) * progress));
    for (let y = 0; y < ROWS; y += 1) for (let x = 0; x < COLS; x += 1) {
      const index = y * COLS + x;
      if (!report.water[index] || (report.distances[index] > threshold && report.distances[index] !== 0)) continue;
      const depth = report.distances[index] === 0 ? .42 : Math.min(.7, .36 + progress * .32);
      context.fillStyle = `rgba(19, 147, 203, ${depth})`;
      context.fillRect(x * CELL, y * CELL, CELL + 1, CELL + 1);
    }
    if (progress > .08) {
      context.fillStyle = 'rgba(255, 205, 108, .72)';
      for (let y = 0; y < ROWS; y += 1) for (let x = 0; x < COLS; x += 1) {
        if (report.barrier[y * COLS + x]) context.fillRect(x * CELL + 1, y * CELL + 1, CELL - 2, CELL - 2);
      }
    }
  }, [progress, report]);
  return <canvas className="tide-overlay" ref={canvasRef} aria-hidden="true" />;
}

function Meter({ label, value, tone = 'blue' }: { label: string; value: string; tone?: 'blue' | 'amber' | 'red' | 'green' }) {
  return <div className={`meter ${tone}`}><small>{label}</small><b>{value}</b></div>;
}

function App() {
  const [phase, setPhase] = useState<Phase>('brief');
  const [report, setReport] = useState<FloodReport | null>(null);
  const [savedImage, setSavedImage] = useState<string | null>(null);
  const [editorImage, setEditorImage] = useState(MAP_SOURCE);
  const [message, setMessage] = useState('');
  const [processing, setProcessing] = useState(false);
  const [editorIssue, setEditorIssue] = useState('');
  const [tideProgress, setTideProgress] = useState(0);
  const editorRef = useRef<ImageEditorRef>(null);

  const editorOptions = useMemo(() => ({
    theme: 'dark' as const,
    features: { imageEditor: { dock: 'right' as const, tools: { crop: false, filter: false, resize: false, frame: false, corners: false, draw: true, shapes: true, text: true, stickers: true } } },
  }), []);

  useEffect(() => {
    if (phase !== 'replay' || !report) return undefined;
    let frame = 0; const start = performance.now(); const duration = 6200;
    const tick = (now: number) => {
      setTideProgress(Math.min(1, (now - start) / duration));
      if (now - start < duration) frame = requestAnimationFrame(tick);
    };
    setTideProgress(0); frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [phase, report]);

  const reset = useCallback(() => {
    setPhase('brief'); setReport(null); setSavedImage(null); setEditorImage(MAP_SOURCE); setMessage(''); setEditorIssue('');
  }, []);
  const openDesk = useCallback(() => { setPhase('edit'); setMessage(''); setEditorIssue(''); }, []);
  const revise = useCallback(() => { if (savedImage) setEditorImage(savedImage); setPhase('edit'); setMessage(''); }, [savedImage]);

  const readSave = useCallback(async ({ dataUrl }: ImageEditorSaveResult) => {
    setProcessing(true); setMessage('Engineering scan: measuring saved construction pixels…');
    try {
      await new Promise<void>((resolve) => window.requestAnimationFrame(() => window.requestAnimationFrame(() => resolve())));
      if (!editorRef.current?.editor?.hasChanges()) { setMessage('No concrete registered. Add a visible hold line, then tap Save again.'); return; }
      const [original, edited] = await Promise.all([loadFrame(MAP_SOURCE), loadFrame(dataUrl)]);
      const next = analyzeFlood(original, edited);
      if (!next.modified) { setMessage('No concrete registered. Add a visible hold line, then tap Save again.'); return; }
      setSavedImage(dataUrl); setReport(next); setPhase('scan'); setMessage('');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'The engineering scan did not complete.'); }
    finally { setProcessing(false); }
  }, []);

  const download = useCallback(() => {
    if (!savedImage) return;
    const link = document.createElement('a'); link.href = savedImage; link.download = 'floodline-last-tide-plan.png'; link.click();
  }, [savedImage]);
  const copyReport = useCallback(async () => {
    if (!report) return;
    const dry = report.assets.filter((asset) => asset.dry).length;
    const text = `FLOODLINE — ${report.title} ${dry}/${ASSETS.length} districts dry. ${report.score}/100 hold score. Built from my saved React Image Editor plan.`;
    try { await navigator.clipboard.writeText(text); setMessage('After-tide report copied.'); } catch { setMessage(text); }
  }, [report]);

  const dryCount = report?.assets.filter((asset) => asset.dry).length ?? 0;

  return <main className={`app phase-${phase}`}>
    <div className="atmosphere" aria-hidden="true" />
    <header className="topbar">
      <button className="brand" type="button" onClick={reset} aria-label="Return to Floodline briefing"><span>FL</span><b>FLOOD<br />LINE</b></button>
      <div className="top-data"><span>MORROW BAY</span><i /><span>SECTOR 04</span><i /><span>SURGE 04:17</span></div>
      <div className="live"><i /> TIDE DESK LIVE</div>
    </header>

    {phase === 'brief' && <section className="brief shell">
      <div className="brief-copy">
        <p className="eyebrow">CIVIL DEFENSE / LAST TIDE PROTOCOL</p>
        <h1>Draw the city<br /><em>a second shoreline.</em></h1>
        <p className="intro">The western surge reaches Morrow Bay at 04:17. Build only three hold lines, then watch the exact saved plan rise—or fail—as the water comes through.</p>
        <div className="brief-facts"><Meter label="SURGE GATES" value="03" tone="amber" /><Meter label="DISTRICTS" value="05" tone="green" /><Meter label="MATERIAL" value={`${MATERIAL_BUDGET}m`} tone="blue" /></div>
        <button className="primary" type="button" onClick={openDesk}><span>Open construction sheet</span><b>→</b></button>
        <p className="fineprint">Draw, shape, text, or stamp: any saved changed pixel becomes concrete. Three structures maximum.</p>
      </div>
      <div className="brief-map map-frame">
        <img src={MAP_SOURCE} alt="A fictional flood-defense map of Morrow Bay with three gate windows and five city districts." />
        <div className="surge-chip"><i /> WESTERN SURGE / INBOUND</div><div className="map-tab">YOUR WALLS<br />START HERE</div>
      </div>
    </section>}

    {phase === 'edit' && <section className="editor-shell">
      <div className="editor-head shell"><div><p className="eyebrow">CONSTRUCTION DESK / ONE SAVED PLAN</p><h1>Seal <i>A</i> <i>·</i> B <i>·</i> C</h1></div><div className="editor-guide"><p>Build a vertical hold line between each pair of amber anchors. <b>Save</b> sends your actual pixels to the tide model.</p><span>↔ Rotate a phone for precise linework</span></div></div>
      <div className="editor-frame">
        {editorIssue ? <div className="editor-fallback"><p className="eyebrow">CONNECTION INTERRUPTED</p><h2>The tide desk lost the sheet.</h2><p>{editorIssue}</p><button className="primary" type="button" onClick={openDesk}>Retry desk <b>↻</b></button></div> : <ImageEditor ref={editorRef} image={editorImage} options={editorOptions} minHeight="min(74vh, 760px)" onSave={readSave} onCancel={reset} onLoadError={() => setEditorIssue('The local construction sheet could not load into React Image Editor.')} onError={(error) => setEditorIssue(error.message || 'React Image Editor could not finish loading.')} />}
        {processing && <div className="processing" role="status"><span />{message}</div>}
        {message && !processing && <div className="editor-message" role="status"><b>ENGINEERING DESK</b><span>{message}</span></div>}
      </div>
      <footer className="editor-footer shell"><span>REACT IMAGE EDITOR / SAVED PIXELS BECOME FLOOD BARRIERS</span><button type="button" onClick={reset}>Abandon plan</button></footer>
    </section>}

    {phase === 'scan' && report && savedImage && <section className="scan shell">
      <div className="scan-copy"><p className="eyebrow">ENGINEERING SCAN / SAVED EXPORT</p><h1>{report.valid ? 'Plan reads.' : 'Plan rejected.'}</h1><p className="intro">{report.valid ? 'The desk found constructible walls in your saved export. Commit the plan and the tide model will test every district.' : `The saved plan exceeds the emergency rule set. Keep it below ${MATERIAL_BUDGET}m and ${MAX_STRUCTURES} disconnected structures.`}</p>
        <div className="scan-metrics"><Meter label="CONCRETE" value={`${report.wallMeters}m / ${MATERIAL_BUDGET}m`} tone={report.wallMeters <= MATERIAL_BUDGET ? 'green' : 'red'} /><Meter label="STRUCTURES" value={`${report.structures} / ${MAX_STRUCTURES}`} tone={report.structures <= MAX_STRUCTURES ? 'green' : 'red'} /><Meter label="OFF-GRID" value={`${report.collateralMeters}m`} tone={report.collateralMeters <= 80 ? 'green' : 'amber'} /></div>
        <div className="gate-list">{report.gates.map((gate) => <div key={gate.id} className={gate.sealed ? 'sealed' : 'open'}><span>{gate.sealed ? '✓' : '×'}</span><b>{gate.label.toUpperCase()}</b><small>{gate.sealed ? 'HOLD CONNECTED' : 'OPEN TO SURGE'}</small></div>)}</div>
        <div className="actions">{report.valid && <button className="primary" type="button" onClick={() => setPhase('replay')}><span>Commit at 04:17</span><b>→</b></button>}<button className="secondary" type="button" onClick={revise}>{report.valid ? 'Emergency revision' : 'Trim the plan'}</button></div>
      </div>
      <div className="scan-map map-frame"><img src={savedImage} alt="The player’s saved Floodline construction plan." /><TideOverlay report={report} progress={.14} /><div className="scan-label">PIXEL CONSTRUCT<br />VALIDATION</div></div>
    </section>}

    {phase === 'replay' && report && savedImage && <section className="replay shell">
      <div className="replay-copy"><p className="eyebrow">AFTER-TIDE REPORT / SIMULATION FROM SAVE</p><h1>{report.title}</h1><p className="intro">{dryCount === ASSETS.length ? 'The western surge met a second shoreline. Every critical district stays illuminated through the peak.' : `${ASSETS.length - dryCount} district${ASSETS.length - dryCount === 1 ? '' : 's'} took water. The replay follows only the concrete pixels in your saved plan.`}</p>
        <div className="score"><span>HOLD SCORE</span><strong>{String(report.score).padStart(2, '0')}<i>/100</i></strong></div><div className="score-bar"><i style={{ width: `${report.score}%` }} /></div>
        <div className="asset-grid">{report.assets.map((asset) => <div className={asset.dry ? 'dry' : 'wet'} key={asset.id}><span>{asset.dry ? '✓' : '×'}</span><div><small>{asset.label.toUpperCase()}</small><b>{asset.dry ? 'STILL LIT' : 'TAKES WATER'}</b></div></div>)}</div>
        <div className="report-row"><span>GATES HELD <b>{report.gates.filter((gate) => gate.sealed).length}/3</b></span><span>CONCRETE <b>{report.wallMeters}m</b></span><span>OFF-GRID <b>{report.collateralMeters}m</b></span></div>
        <div className="actions"><button className="primary" type="button" onClick={download}><span>Keep after-tide plan</span><b>↓</b></button><button className="secondary" type="button" onClick={copyReport}>Copy report</button><button className="quiet" type="button" onClick={revise}>Rebuild walls</button></div>{message && <p className="inline-message">{message}</p>}
      </div>
      <div className="replay-map map-frame"><img src={savedImage} alt="The player’s saved plan under an animated flood simulation." /><TideOverlay report={report} progress={tideProgress} /><div className="replay-label"><span>{tideProgress < .97 ? 'TIDE MODEL / RUNNING' : 'TIDE PEAK / FINAL'}</span><b>{dryCount}/{ASSETS.length} DISTRICTS DRY</b></div><div className="timecode">04:{String(Math.min(59, 17 + Math.round(tideProgress * 34))).padStart(2, '0')} / SURGE</div></div>
      <aside className="method"><b>WHAT THE TIDE MODEL MEASURES</b> It compares visible saved pixels with the original local map, reduces those changes to a barrier grid, then floods a deterministic city grid around the constructed cells. It does not infer your intended wall, draw order, or real-world flood risk.</aside>
    </section>}
  </main>;
}

export default App;
