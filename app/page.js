'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

const TOOLS = [
  { id: 'merge', name: 'Merge PDF', icon: '📑', multi: true, accept: '.pdf' },
  { id: 'split', name: 'Split PDF', icon: '✂️', multi: false, accept: '.pdf' },
  { id: 'compress', name: 'Compress PDF', icon: '📦', multi: false, accept: '.pdf' },
  { id: 'rotate', name: 'Rotate PDF', icon: '🔄', multi: false, accept: '.pdf' },
  { id: 'watermark', name: 'Watermark', icon: '💧', multi: false, accept: '.pdf' },
  { id: 'lock', name: 'Lock PDF', icon: '🔒', multi: false, accept: '.pdf' },
  { id: 'unlock', name: 'Unlock PDF', icon: '🔓', multi: false, accept: '.pdf' },
  { id: 'jpg-to-pdf', name: 'JPG to PDF', icon: '🖼️', multi: true, accept: '.jpg,.jpeg,.png' },
  { id: 'page-number', name: 'Page Numbers', icon: '🔢', multi: false, accept: '.pdf' },
];

export default function Home() {
  const [tool, setTool] = useState(null);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const onDrop = useCallback((accepted) => {
    setError('');
    setResult(null);
    if (!tool) { setError('Select a tool first'); return; }
    const max = tool.multi ? 20 : 1;
    if (accepted.length > max) { setError(`Max ${max} file(s)`); return; }
    const size = accepted.reduce((s, f) => s + f.size, 0);
    if (size > 50000000) { setError('Max 50MB total'); return; }
    setFiles(accepted.map(f => ({ file: f, id: Math.random().toString(36) })));
  }, [tool]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, multiple: tool?.multi || false });

  const process = async () => {
    if (!files.length) return;
    setLoading(true);
    setProgress(0);
    try {
      const bufs = await Promise.all(files.map(f => f.file.arrayBuffer()));
      setProgress(10);
      let res;
      if (tool.id === 'merge') res = await mergePdfs(bufs);
      else if (tool.id === 'split') res = await splitPdf(bufs[0]);
      else if (tool.id === 'compress') res = await compressPdf(bufs[0]);
      else if (tool.id === 'rotate') res = await rotatePdf(bufs[0]);
      else if (tool.id === 'watermark') res = await watermarkPdf(bufs[0]);
      else if (tool.id === 'lock') res = await lockPdf(bufs[0]);
      else if (tool.id === 'unlock') res = await unlockPdf(bufs[0]);
      else if (tool.id === 'jpg-to-pdf') res = await jpgToPdf(bufs);
      else if (tool.id === 'page-number') res = await addNumbers(bufs[0]);
      setProgress(90);
      const ext = tool.id === 'split' ? 'zip' : 'pdf';
      const mime = ext === 'zip' ? 'application/zip' : 'application/pdf';
      const blob = new Blob([res], { type: mime });
      setResult({ url: URL.createObjectURL(blob), name: `${tool.id}-result.${ext}` });
      setProgress(100);
    } catch (e) {
      setError(e.message || 'Failed');
    }
    setLoading(false);
  };

  const reset = () => { setTool(null); setFiles([]); setResult(null); setError(''); };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 20 }}>
      <div style={{ textAlign: 'center', padding: '30px 0' }}>
        <h1 style={{ fontSize: 28, color: '#1a1a2e', margin: 0 }}>📄 Free PDF Tools</h1>
        <p style={{ color: '#666' }}>Edit PDFs in your browser • No uploads • Free</p>
      </div>

      {!tool ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {TOOLS.map(t => (
            <button key={t.id} onClick={() => setTool(t)} style={{
              padding: 20, background: 'white', border: '2px solid #e5e7eb',
              borderRadius: 12, cursor: 'pointer', textAlign: 'center'
            }}>
              <div style={{ fontSize: 30 }}>{t.icon}</div>
              <div style={{ fontWeight: 600, marginTop: 8 }}>{t.name}</div>
            </button>
          ))}
        </div>
      ) : (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            background: 'white', padding: 15, borderRadius: 12, marginBottom: 15, border: '1px solid #e5e7eb' }}>
            <span><span style={{ fontSize: 24 }}>{tool.icon}</span> <strong>{tool.name}</strong></span>
            <button onClick={reset} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#f3f4f6', cursor: 'pointer' }}>← Back</button>
          </div>

          <div {...getRootProps()} style={{
            border: `3px dashed ${isDragActive ? '#3b82f6' : '#d1d5db'}`,
            borderRadius: 16, padding: 40, textAlign: 'center', background: isDragActive ? '#eff6ff' : 'white',
            cursor: 'pointer', marginBottom: 15
          }}>
            <input {...getInputProps()} />
            <div style={{ fontSize: 40 }}>📁</div>
            <div style={{ fontSize: 18, marginTop: 10 }}>
              {isDragActive ? 'Drop here...' : 'Tap to browse or drop files'}
            </div>
            <div style={{ color: '#888', fontSize: 14, marginTop: 5 }}>
              {tool.multi ? 'Multiple files • ' : 'Single file • '}Max 50MB
            </div>
          </div>

          {error && <div style={{ background: '#fef2f2', color: '#dc2626', padding: 12, borderRadius: 8, marginBottom: 15, border: '1px solid #fecaca' }}>⚠️ {error}</div>}

          {files.length > 0 && (
            <div style={{ background: 'white', borderRadius: 12, padding: 15, marginBottom: 15, border: '1px solid #e5e7eb' }}>
              {files.map(f => (
                <div key={f.id} style={{ display: 'flex', alignItems: 'center', padding: 5, gap: 8, borderBottom: '1px solid #f3f4f6' }}>
                  <span>📄</span>
                  <span style={{ flex: 1 }}>{f.file.name}</span>
                  <span style={{ color: '#888', fontSize: 13 }}>{(f.file.size / 1024 / 1024).toFixed(2)} MB</span>
                </div>
              ))}
            </div>
          )}

          {loading && (
            <div style={{ marginBottom: 15 }}>
              <div style={{ height: 8, background: '#e5e7eb', borderRadius: 8 }}>
                <div style={{ height: '100%', width: `${progress}%`, background: '#3b82f6', borderRadius: 8, transition: 'width 0.3s' }} />
              </div>
              <div style={{ textAlign: 'center', color: '#666', marginTop: 5 }}>Processing... {progress}%</div>
            </div>
          )}

          {files.length > 0 && !loading && !result && (
            <button onClick={process} style={{
              width: '100%', padding: 15, background: '#3b82f6', color: 'white',
              border: 'none', borderRadius: 12, fontSize: 16, fontWeight: 600, cursor: 'pointer'
            }}>
              Process {tool.name}
            </button>
          )}

          {result && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: '#10b981', fontSize: 20, marginBottom: 10 }}>✅ Complete!</div>
              <a href={result.url} download={result.name} style={{
                display: 'inline-block', padding: '15px 40px', background: '#10b981',
                color: 'white', borderRadius: 12, textDecoration: 'none', fontSize: 16, fontWeight: 600
              }}>
                📥 Download
              </a>
              <br />
              <button onClick={reset} style={{ marginTop: 15, padding: '10px 25px', background: '#f3f4f6', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
                Process Another
              </button>
            </div>
          )}
        </div>
      )}

      <div style={{ textAlign: 'center', marginTop: 40, color: '#aaa', fontSize: 13 }}>
        🔒 Files stay in your browser • No server uploads • Free forever
      </div>
    </div>
  );
}

async function mergePdfs(bufs) {
  const merged = await PDFDocument.create();
  for (const buf of bufs) {
    const pdf = await PDFDocument.load(buf);
    const pages = await merged.copyPages(pdf, pdf.getPageIndices());
    pages.forEach(p => merged.addPage(p));
  }
  return await merged.save();
}

async function splitPdf(buf) {
  const pdf = await PDFDocument.load(buf);
  const total = pdf.getPageCount();
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();
  for (let i = 0; i < total; i++) {
    const doc = await PDFDocument.create();
    const [page] = await doc.copyPages(pdf, [i]);
    doc.addPage(page);
    zip.file(`page_${i + 1}.pdf`, await doc.save());
  }
  return await zip.generateAsync({ type: 'uint8array' });
}

async function compressPdf(buf) {
  const pdf = await PDFDocument.load(buf, { ignoreEncryption: true });
  return await pdf.save({ useObjectStreams: true });
}

async function rotatePdf(buf) {
  const pdf = await PDFDocument.load(buf);
  pdf.getPages().forEach(p => p.setRotation({ angle: (p.getRotation().angle + 90) % 360 }));
  return await pdf.save();
}

async function watermarkPdf(buf) {
  const pdf = await PDFDocument.load(buf);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  pdf.getPages().forEach(p => {
    const { width, height } = p.getSize();
    p.drawText('DRAFT', {
      x: width/2-80, y: height/2, size: 50, font,
      color: rgb(0.8, 0.8, 0.8), opacity: 0.3,
      rotate: { angle: -45, origin: [width/2, height/2] }
    });
  });
  return await pdf.save();
}

async function lockPdf(buf) {
  const pdf = await PDFDocument.load(buf);
  pdf.encrypt({ userPassword: '12345', ownerPassword: 'owner' });
  return await pdf.save();
}

async function unlockPdf(buf) {
  const pdf = await PDFDocument.load(buf, { password: '12345', ignoreEncryption: true });
  return await pdf.save();
}

async function jpgToPdf(bufs) {
  const pdf = await PDFDocument.create();
  for (const buf of bufs) {
    const arr = new Uint8Array(buf);
    const img = arr[0] === 0x89 ? await pdf.embedPng(buf) : await pdf.embedJpg(buf);
    const page = pdf.addPage([595, 842]);
    const dims = img.scale(1);
    const s = Math.min(555/dims.width, 802/dims.height);
    page.drawImage(img, { x: (595-dims.width*s)/2, y: (842-dims.height*s)/2, width: dims.width*s, height: dims.height*s });
  }
  return await pdf.save();
}

async function addNumbers(buf) {
  const pdf = await PDFDocument.load(buf);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  pdf.getPages().forEach((p, i) => {
    p.drawText(`${i + 1}`, { x: p.getSize().width/2-10, y: 30, size: 12, font, color: rgb(0,0,0) });
  });
  return await pdf.save();
  }
