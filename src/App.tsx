import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ImageEditor, { type ImageEditorRef, type ImageEditorSaveResult } from '@unlayer/react-image-editor';
import { analyzeNightprint, type NightprintReport, type PixelFrame } from './afterglow';

const PRINT_SOURCE = '/nightprint/afterglow-base.png';
const ANALYSIS_WIDTH = 360;
const ANALYSIS_HEIGHT = 240;
type Phase = 'brief' | 'edit' | 'scan' | 'reveal';
type ZoneId = 'market' | 'wall' | 'sail';

const ZONES: Array<{ id: ZoneId; label: string; surface: string; note: string }> = [
  { id: 'market', label: '01 / MARKET', surface: 'canopy', note: 'Lanterns and hand-printed awnings' },
  { id: 'wall', label: '02 / WATERLINE', surface: 'seawall', note: 'A 12-storey tide-house projection' },
  { id: 'sail', label: '03 / QUIET QUAY', surface: 'sail', note: 'A night ferry carrying your signal' },
];

function loadFrame(source: string): Promise<PixelFrame> {
  return new Promise((resolve, reject) => {
    const image = new Image(); image.decoding = 'async';
    image.onload = () => {
      const canvas = document.createElement('canvas'); canvas.width = ANALYSIS_WIDTH; canvas.height = ANALYSIS_HEIGHT;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) { reject(new Error('The print scanner could not open a canvas.')); return; }
      context.drawImage(image, 0, 0, ANALYSIS_WIDTH, ANALYSIS_HEIGHT);
      try { resolve({ width: ANALYSIS_WIDTH, height: ANALYSIS_HEIGHT, data: context.getImageData(0, 0, ANALYSIS_WIDTH, ANALYSIS_HEIGHT).data }); }
      catch { reject(new Error('The saved nightprint could not be read.')); }
    };
    image.onerror = () => reject(new Error('The original nightprint could not load.'));
    image.src = source;
  });
}

function drawImageInShape(context: CanvasRenderingContext2D, image: HTMLImageElement, sourceX: number, points: Array<[number, number]>, brightness: number, alpha: number) {
  const xs = points.map(([x]) => x); const ys = points.map(([, y]) => y);
  const left = Math.min(...xs); const top = Math.min(...ys); const width = Math.max(...xs) - left; const height = Math.max(...ys) - top;
  context.save(); context.beginPath();
  points.forEach(([x, y], index) => index ? context.lineTo(x, y) : context.moveTo(x, y));
  context.closePath(); context.clip(); context.globalAlpha = alpha; context.filter = `brightness(${brightness}) saturate(1.18)`;
  context.drawImage(image, sourceX, 0, image.width / 3, image.height, left, top, width, height);
  context.filter = 'none'; context.globalAlpha = 1; context.restore();
}

function CityCanvas({ imageSource, report, selectedZone, canvasRef }: { imageSource: string; report: NightprintReport; selectedZone: ZoneId; canvasRef: React.MutableRefObject<HTMLCanvasElement | null> }) {
  const imageRef = useRef<HTMLImageElement | null>(null);
  const imageReady = useRef(false);
  const animation = useRef<number>(0);

  useEffect(() => {
    const image = new Image(); image.decoding = 'async'; image.onload = () => { imageRef.current = image; imageReady.current = true; };
    image.src = imageSource;
    return () => { imageReady.current = false; imageRef.current = null; };
  }, [imageSource]);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return undefined;
    const context = canvas.getContext('2d'); if (!context) return undefined;
    const width = 1600; const height = 980; canvas.width = width; canvas.height = height;
    const start = performance.now();
    const render = (now: number) => {
      const appear = Math.min(1, (now - start) / 1800); const shimmer = .5 + .5 * Math.sin(now / 700);
      const gradient = context.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, '#110b36'); gradient.addColorStop(.47, '#70406b'); gradient.addColorStop(.71, '#ee765b'); gradient.addColorStop(1, '#070d25');
      context.fillStyle = gradient; context.fillRect(0, 0, width, height);
      context.fillStyle = 'rgba(255, 196, 88, .68)'; context.beginPath(); context.arc(955, 255, 125, 0, Math.PI * 2); context.fill();
      context.fillStyle = 'rgba(20, 11, 46, .45)'; context.fillRect(0, 0, width, 210);
      for (let i = 0; i < 100; i += 1) { context.fillStyle = `rgba(255, 245, 201, ${.13 + ((i * 29) % 30) / 160})`; context.fillRect((i * 137) % width, (i * 71) % 390, 2, 2); }

      const buildings = [[0, 420, 145, 240], [125, 350, 180, 310], [285, 430, 120, 230], [397, 370, 154, 290], [544, 270, 430, 390], [964, 400, 138, 260], [1096, 338, 168, 322], [1252, 405, 150, 255], [1395, 355, 205, 305]];
      buildings.forEach(([x, y, w, h], buildingIndex) => {
        context.fillStyle = buildingIndex === 4 ? '#13122d' : '#191733'; context.fillRect(x, y, w, h);
        const lit = .18 + ((buildingIndex * 13) % 8) / 25;
        for (let row = y + 25; row < y + h - 25; row += 34) for (let col = x + 23; col < x + w - 20; col += 36) { context.fillStyle = `rgba(255, 198, 102, ${lit + ((row + col) % 5) / 20})`; context.fillRect(col, row, 10, 15); }
      });
      context.fillStyle = 'rgba(9, 10, 32, .9)'; context.fillRect(0, 645, width, 170); context.fillStyle = '#0b183a'; context.fillRect(0, 815, width, 165);
      for (let row = 0; row < 8; row += 1) { context.strokeStyle = `rgba(105, 181, 230, ${.1 + row / 80})`; context.lineWidth = 3; context.beginPath(); context.moveTo(0, 835 + row * 22); context.bezierCurveTo(340, 800 + row * 31, 720, 875 - row * 10, width, 825 + row * 16); context.stroke(); }

      const art = imageReady.current ? imageRef.current : null;
      const zoneMap = Object.fromEntries(report.zones.map((zone) => [zone.id, zone]));
      const market = zoneMap.market; const wall = zoneMap.wall; const sail = zoneMap.sail;
      const marketAlpha = .18 + market.signal / 130 * appear; const wallAlpha = .18 + wall.signal / 125 * appear; const sailAlpha = .18 + sail.signal / 130 * appear;
      if (art) {
        drawImageInShape(context, art, 0, [[78, 491], [520, 452], [564, 645], [114, 674]], .64 + market.signal / 100 * .6, marketAlpha);
        drawImageInShape(context, art, art.width / 3, [[600, 315], [959, 315], [959, 659], [600, 659]], .52 + wall.signal / 100 * .72, wallAlpha);
        drawImageInShape(context, art, art.width * 2 / 3, [[1218, 656], [1444, 400], [1517, 656]], .55 + sail.signal / 100 * .67, sailAlpha);
      }
      context.save(); context.globalAlpha = .85; context.fillStyle = '#16142e'; context.fillRect(562, 255, 438, 424); context.fillStyle = '#242241'; context.fillRect(584, 285, 390, 382); if (art) drawImageInShape(context, art, art.width / 3, [[608, 317], [956, 317], [956, 656], [608, 656]], .58 + wall.signal / 100 * .78, wallAlpha); context.restore();
      context.strokeStyle = `rgba(255, 215, 120, ${.22 + wall.signal / 210 + shimmer / 10})`; context.lineWidth = 7; context.strokeRect(600, 309, 365, 356); context.fillStyle = `rgba(255, 193, 104, ${.13 + wall.signal / 240})`; context.fillRect(596, 678, 372, 13);
      context.fillStyle = '#31213f'; context.fillRect(58, 649, 535, 36); context.strokeStyle = `rgba(255, 189, 99, ${.25 + market.signal / 175 + shimmer / 9})`; context.lineWidth = 4; context.beginPath(); context.moveTo(76, 492); context.lineTo(520, 454); context.lineTo(565, 646); context.lineTo(114, 675); context.closePath(); context.stroke();
      for (let i = 0; i < 10; i += 1) { context.fillStyle = `rgba(255, 193, 88, ${.18 + market.signal / 200})`; context.beginPath(); context.arc(110 + i * 44, 455 + (i % 3) * 10, 5 + (i % 2) * 2, 0, Math.PI * 2); context.fill(); }
      context.fillStyle = '#15142f'; context.beginPath(); context.moveTo(1195, 668); context.lineTo(1446, 372); context.lineTo(1538, 668); context.closePath(); context.fill(); if (art) drawImageInShape(context, art, art.width * 2 / 3, [[1223, 650], [1444, 404], [1514, 650]], .6 + sail.signal / 100 * .7, sailAlpha);
      context.strokeStyle = `rgba(255, 223, 132, ${.18 + sail.signal / 180 + shimmer / 10})`; context.lineWidth = 5; context.beginPath(); context.moveTo(1218, 656); context.lineTo(1444, 400); context.lineTo(1517, 656); context.closePath(); context.stroke(); context.fillStyle = '#1b1834'; context.fillRect(1168, 658, 370, 22); context.fillRect(1345, 665, 12, 117);
      for (let i = 0; i < 36; i += 1) { const x = 80 + ((i * 109) % 1430); const y = 720 + (i % 4) * 19; context.fillStyle = '#100e27'; context.beginPath(); context.arc(x, y, 8, 0, Math.PI * 2); context.fill(); context.fillRect(x - 7, y + 8, 14, 30); }
      context.fillStyle = 'rgba(255, 244, 206, .8)'; context.font = '700 20px monospace'; context.fillText('AFTERGLOW / YOUR PRINT IS LIVE', 72, 86); context.fillStyle = 'rgba(255, 244, 206, .72)'; context.font = '16px monospace'; context.fillText('SABLE MARKET   ·   TIDE HOUSE   ·   QUIET QUAY', 72, 118);
      const selected = ZONES.find((zone) => zone.id === selectedZone);
      if (selected) { context.fillStyle = 'rgba(13, 14, 39, .78)'; context.fillRect(1100, 750, 390, 73); context.fillStyle = '#ffd169'; context.font = '700 17px monospace'; context.fillText(selected.label, 1122, 779); context.fillStyle = '#fff1c5'; context.font = '14px monospace'; context.fillText(selected.note.toUpperCase(), 1122, 806); }
      animation.current = window.requestAnimationFrame(render);
    };
    animation.current = window.requestAnimationFrame(render);
    return () => window.cancelAnimationFrame(animation.current);
  }, [canvasRef, report, selectedZone]);
  return <canvas className="city-canvas" ref={canvasRef} aria-label="An illustrated coastal city where the player’s saved nightprint is projected across a seawall, market canopy, and ferry sail." />;
}

function Meter({ label, value, status }: { label: string; value: string; status?: string }) { return <div className="meter"><small>{label}</small><b>{value}</b>{status && <span>{status}</span>}</div>; }

function App() {
  const [phase, setPhase] = useState<Phase>('brief'); const [report, setReport] = useState<NightprintReport | null>(null); const [savedImage, setSavedImage] = useState<string | null>(null); const [editorImage, setEditorImage] = useState(PRINT_SOURCE); const [message, setMessage] = useState(''); const [processing, setProcessing] = useState(false); const [editorIssue, setEditorIssue] = useState(''); const [selectedZone, setSelectedZone] = useState<ZoneId>('wall');
  const editorRef = useRef<ImageEditorRef>(null); const cityCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const editorOptions = useMemo(() => ({ theme: 'dark' as const, features: { imageEditor: { dock: 'right' as const, tools: { crop: true, filter: true, resize: false, frame: false, corners: false, draw: true, shapes: true, text: true, stickers: true } } } }), []);
  const reset = useCallback(() => { setPhase('brief'); setReport(null); setSavedImage(null); setEditorImage(PRINT_SOURCE); setMessage(''); setEditorIssue(''); setSelectedZone('wall'); }, []);
  const openDesk = useCallback(() => { setPhase('edit'); setMessage(''); setEditorIssue(''); }, []);
  const revise = useCallback(() => { if (savedImage) setEditorImage(savedImage); setPhase('edit'); setMessage(''); }, [savedImage]);
  const readSave = useCallback(async ({ dataUrl }: ImageEditorSaveResult) => { setProcessing(true); setMessage('Reading the saved print…'); try { await new Promise<void>((resolve) => window.requestAnimationFrame(() => window.requestAnimationFrame(() => resolve()))); if (!editorRef.current?.editor?.hasChanges()) { setMessage('Make one visible mark, then tap Save again.'); return; } const [original, edited] = await Promise.all([loadFrame(PRINT_SOURCE), loadFrame(dataUrl)]); const next = analyzeNightprint(original, edited); if (!next.modified) { setMessage('The scanner could not find a visible saved change. Try a bolder mark or a little more contrast.'); return; } setSavedImage(dataUrl); setEditorImage(dataUrl); setReport(next); setPhase('scan'); setMessage(''); } catch (error) { setMessage(error instanceof Error ? error.message : 'The saved print could not be read.'); } finally { setProcessing(false); } }, []);
  const downloadPrint = useCallback(() => { if (!savedImage) return; const link = document.createElement('a'); link.href = savedImage; link.download = 'afterglow-my-nightprint.png'; link.click(); }, [savedImage]);
  const downloadCityCard = useCallback(() => { const city = cityCanvasRef.current; if (!city || !savedImage) return; const card = document.createElement('canvas'); card.width = 1080; card.height = 1350; const context = card.getContext('2d'); if (!context) return; const image = new Image(); image.onload = () => { const bg = context.createLinearGradient(0, 0, 0, card.height); bg.addColorStop(0, '#ffbd77'); bg.addColorStop(.45, '#6c3a73'); bg.addColorStop(1, '#0e1030'); context.fillStyle = bg; context.fillRect(0, 0, card.width, card.height); context.drawImage(city, 36, 44, 1008, 618); context.fillStyle = '#fff0c8'; context.font = '700 48px Arial'; context.fillText('AFTERGLOW', 60, 740); context.font = '22px monospace'; context.fillText('MY CITY ANSWERED', 63, 778); context.save(); context.shadowColor = 'rgba(0,0,0,.38)'; context.shadowBlur = 22; context.shadowOffsetY = 13; context.drawImage(image, 60, 828, 960, 400); context.restore(); context.fillStyle = '#fff0c8'; context.font = '18px monospace'; context.fillText('ONE PRINT · THREE BLOCKS · MADE WITH REACT IMAGE EDITOR', 60, 1284); const link = document.createElement('a'); link.href = card.toDataURL('image/png'); link.download = 'afterglow-my-city-card.png'; link.click(); }; image.src = savedImage; }, [savedImage]);
  const copyShare = useCallback(async () => { const text = 'I made a nightprint in AFTERGLOW, then watched my actual React Image Editor export light up a fictional coastal city.'; try { await navigator.clipboard.writeText(text); setMessage('Share caption copied.'); } catch { setMessage(text); } }, []);

  return <main className={`app phase-${phase}`}><div className="grain" aria-hidden="true" /><header className="topbar"><button className="brand" type="button" onClick={reset} aria-label="Return to AFTERGLOW"><span>AG</span><b>AFTER<br />GLOW</b></button><div className="top-data"><span>THE LAST LIGHT FESTIVAL</span><i /><span>ONE NIGHT ONLY</span></div><div className="live"><i /> PRINT DESK LIVE</div></header>
    {phase === 'brief' && <section className="brief shell"><div className="brief-copy"><p className="eyebrow">A CITY-SCALE PRINT EXPERIENCE / 19:42</p><h1>Make a mark.<br /><em>Watch the city catch it.</em></h1><p className="intro">Tonight, three blank surfaces wait on the coast. Make one nightprint in React Image Editor. When you release it, your exact saved artwork becomes a canopy, a seawall projection, and a ferry sail—then the whole block comes alive around it.</p><div className="brief-facts"><Meter label="YOUR CANVAS" value="1 PRINT" /><Meter label="CITY SURFACES" value="03" /><Meter label="TAKEAWAYS" value="02 FILES" /></div><button className="primary" type="button" onClick={openDesk}><span>Make your nightprint</span><b>→</b></button><p className="fineprint">Draw, type, shape, sticker, filter, or crop. Make it yours. You keep the print and a city takeover card.</p></div><div className="hero-print" aria-label="Original screen-printed artwork that will be editable in the next step"><img src={PRINT_SOURCE} alt="Original three-panel coastal screen print with a sunset, lanterns, waves, and dancers." /><div className="print-stamp">YOUR<br />NIGHTPRINT</div><div className="print-note">EDIT · RELEASE · KEEP</div><div className="light-pins"><span>MARKET</span><span>WATERLINE</span><span>QUIET QUAY</span></div></div></section>}
    {phase === 'edit' && <section className="editor-shell"><div className="editor-head shell"><div><p className="eyebrow">THE NIGHTPRINT DESK / ONE ORIGINAL PIECE</p><h1>Put your name<br /><i>in the light.</i></h1></div><div className="editor-guide"><p>There is no right image. Make one visual move in each third if you want the market, waterline, and ferry to answer together. <b>Save</b> sends your actual exported pixels to the city.</p><span>On a phone, rotate for the widest desk.</span></div></div><div className="editor-frame">{editorIssue ? <div className="editor-fallback"><p className="eyebrow">PRINT DESK OFFLINE</p><h2>The blank wall lost its signal.</h2><p>{editorIssue}</p><button className="primary" type="button" onClick={openDesk}>Retry desk <b>↻</b></button></div> : <ImageEditor ref={editorRef} image={editorImage} options={editorOptions} minHeight="min(74vh, 760px)" onSave={readSave} onCancel={reset} onLoadError={() => setEditorIssue('The local nightprint could not load into React Image Editor.')} onError={(error) => setEditorIssue(error.message || 'React Image Editor could not finish loading.')} />}{processing && <div className="processing" role="status"><span />{message}</div>}{message && !processing && <div className="editor-message" role="status"><b>PRINT DESK</b><span>{message}</span></div>}</div><footer className="editor-footer shell"><span>REACT IMAGE EDITOR / YOUR SAVED EXPORT BECOMES THE CITY MATERIAL</span><button type="button" onClick={reset}>Start over</button></footer></section>}
    {phase === 'scan' && report && savedImage && <section className="scan shell"><div className="scan-copy"><p className="eyebrow">PRINT CHECK / YOUR SAVED EXPORT</p><h1>The city<br /><em>found you.</em></h1><p className="intro">Your image is ready to travel. The release desk does not interpret what your art means: it simply measures visible saved-pixel change in each third, then uses the exact saved image as material on the corresponding city surface.</p><div className="zone-meters">{report.zones.map((zone) => <Meter key={zone.id} label={ZONES.find((item) => item.id === zone.id)?.label || zone.id} value={`${zone.coverage}%`} status={zone.message} />)}</div><div className="scan-actions"><button className="primary" type="button" onClick={() => setPhase('reveal')}><span>Release it to the city</span><b>→</b></button><button className="secondary" type="button" onClick={revise}>Keep editing</button></div><p className="method"><b>AN HONEST EFFECT:</b> broad visual edits give their matching block more glow. Every projected surface is composited from your saved export; no AI or semantic image reading is claimed.</p></div><div className="scan-print"><img src={savedImage} alt="The player’s saved custom nightprint." /><div className="scan-band one">01<br />MARKET</div><div className="scan-band two">02<br />WATERLINE</div><div className="scan-band three">03<br />QUIET QUAY</div><div className="scan-tag">SAVED<br />AT 19:42</div></div></section>}
    {phase === 'reveal' && report && savedImage && <section className="reveal shell"><div className="reveal-copy"><p className="eyebrow">19:42 / THE CITY ANSWERS</p><h1>Your print<br /><em>escaped the page.</em></h1><p className="intro">Tap a block to follow your artwork from ink to infrastructure. This is not a staged mockup: the player’s saved export is physically composited into every illuminated surface.</p><div className="zone-list">{ZONES.map((zone) => { const data = report.zones.find((item) => item.id === zone.id); const active = selectedZone === zone.id; return <button key={zone.id} className={active ? 'active' : ''} type="button" onClick={() => setSelectedZone(zone.id)}><small>{zone.label}</small><b>{zone.surface.toUpperCase()}</b><span>{data?.message || ''} · {data?.coverage || 0}% changed</span></button>; })}</div><div className="reveal-actions"><button className="primary" type="button" onClick={downloadCityCard}><span>Download city card</span><b>↓</b></button><button className="secondary" type="button" onClick={downloadPrint}>Keep nightprint</button><button className="quiet" type="button" onClick={copyShare}>Copy caption</button><button className="quiet" type="button" onClick={revise}>Make another</button></div>{message && <p className="inline-message">{message}</p>}</div><div className="city-frame"><CityCanvas imageSource={savedImage} report={report} selectedZone={selectedZone} canvasRef={cityCanvasRef} /><div className="city-badge"><span>THE LAST LIGHT FESTIVAL</span><b>YOUR PRINT / LIVE</b></div><div className="city-time">19:42<br />COASTAL STANDARD</div></div><aside className="takeaway"><b>WHAT YOU KEEP</b><span>01 / Your edited full-resolution nightprint</span><span>02 / A shareable city takeover card built in your browser</span></aside></section>}
  </main>;
}

export default App;
