'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

const TOOLS = [
  { id: 'merge', name: 'Merge PDF', icon: '📑', multi: true, accept: { 'application/pdf': ['.pdf'] } },
  { id: 'split', name: 'Split PDF', icon: '✂️', multi: false, accept: { 'application/pdf': ['.pdf'] } },
  { id: 'compress', name: 'Compress PDF', icon: '📦', multi: false, accept: { 'application/pdf': ['.pdf'] } },
  { id: 'rotate', name: 'Rotate PDF', icon: '🔄', multi: false, accept: { 'application/pdf': ['.pdf'] } },
  { id: 'watermark', name: 'Watermark PDF', icon: '💧', multi: false, accept: { 'application/pdf': ['.pdf'] } },
  { id: 'lock', name: 'Lock PDF', icon: '🔒', multi: false, accept: { 'application/pdf': ['.pdf'] } },
  { id: 'unlock', name: 'Unlock PDF', icon: '🔓', multi: false, accept: { 'application/pdf': ['.pdf'] } },
  { id: 'jpg-to-pdf', name: 'JPG to PDF', icon: '🖼️', multi: true, accept: { 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'] } },
  { id: 'page-number', name: 'Add Page Numbers', icon: '🔢', multi: false, accept: { 'application/pdf': ['.pdf'] } },
  { id: 'crop', name: 'Crop PDF', icon: '✂️', multi: false, accept: { 'application/pdf': ['.pdf'] } },
];

export default function Home() {
  const [tool, setTool] = useState(null);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [resultUrl, setResultUrl] = useState(null);
  const [resultName, setResultName] = useState('');
  const [error, setError] = useState('');

  const onDrop = useCallback((accepted) => {
    setError('');
    setResultUrl(null);
    
    if (!tool) {
      setError('Please select a tool first');
      return;
    }
    
    const maxFiles = tool.multi ? 30 : 1;
    if (accepted.length > maxFiles) {
      setError(`Maximum ${maxFiles} file(s) allowed`);
      return;
    }
    
    const totalSize = accepted.reduce((s, f) => s + f.size, 0);
    if (totalSize > 50 * 1024 * 1024) {
      setError('Total file size exceeds 50MB limit');
      return;
    }
    
    setFiles(accepted);
  }, [tool]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: tool?.accept || undefined,
    multiple: tool?.multi || false,
    maxSize: 50 * 1024 * 1024,
  });

  const readFileAsUint8Array = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(new Uint8Array(reader.result));
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  };

  const processFiles = async () => {
    if (files.length === 0) return;
    
    setLoading(true);
    setProgress(5);
    setError('');
    setResultUrl(null);

    try {
      const buffers = [];
      for (let i = 0; i < files.length; i++) {
        buffers.push(await readFileAsUint8Array(files[i]));
        setProgress(5 + Math.round((i / files.length) * 10));
      }

      let outputBytes;
      let outputName;
      const toolId = tool.id;

      setProgress(20);

      if (toolId === 'merge') {
        const merged = await PDFDocument.create();
        for (let i = 0; i < buffers.length; i++) {
          const pdf = await PDFDocument.load(buffers[i]);
          const pages = await merged.copyPages(pdf, pdf.getPageIndices());
          pages.forEach(p => merged.addPage(p));
          setProgress(20 + Math.round(((i + 1) / buffers.length) * 60));
        }
        outputBytes = await merged.save();
        outputName = 'merged.pdf';
      }
      else if (toolId === 'split') {
        const pdf = await PDFDocument.load(buffers[0]);
        const totalPages = pdf.getPageCount();
        const JSZip = (await import('jszip')).default;
        const zip = new JSZip();
        
        for (let i = 0; i < totalPages; i++) {
          const newDoc = await PDFDocument.create();
          const [page] = await newDoc.copyPages(pdf, [i]);
          newDoc.addPage(page);
          zip.file(`page_${i + 1}.pdf`, await newDoc.save());
          setProgress(20 + Math.round(((i + 1) / totalPages) * 60));
        }
        outputBytes = await zip.generateAsync({ type: 'uint8array' });
        outputName = 'split-pages.zip';
      }
      else if (toolId === 'compress') {
        const pdf = await PDFDocument.load(buffers[0]);
        setProgress(50);
        outputBytes = await pdf.save({ useObjectStreams: true });
        outputName = 'compressed.pdf';
      }
      else if (toolId === 'rotate') {
        const pdf = await PDFDocument.load(buffers[0]);
        const pages = pdf.getPages();
        for (let i = 0; i < pages.length; i++) {
          const current = pages[i].getRotation().angle || 0;
          pages[i].setRotation({ angle: (current + 90) % 360 });
          setProgress(20 + Math.round(((i + 1) / pages.length) * 60));
        }
        outputBytes = await pdf.save();
        outputName = 'rotated.pdf';
      }
      else if (toolId === 'watermark') {
        const pdf = await PDFDocument.load(buffers[0]);
        const pages = pdf.getPages();
        const font = await pdf.embedFont(StandardFonts.Helvetica);
        
        for (let i = 0; i < pages.length; i++) {
          const page = pages[i];
          const { width, height } = page.getSize();
          const text = 'DRAFT';
          const fontSize = Math.min(width, height) * 0.1;
          
          page.drawText(text, {
            x: width / 4,
            y: height / 2,
            size: fontSize,
            font,
            color: rgb(1, 0, 0),
            opacity: 0.15,
            rotate: { angle: -45, origin: [width/2, height/2] }
          });
          
          setProgress(20 + Math.round(((i + 1) / pages.length) * 60));
        }
        outputBytes = await pdf.save();
        outputName = 'watermarked.pdf';
      }
      else if (toolId === 'lock') {
        const pdf = await PDFDocument.load(buffers[0]);
        setProgress(50);
        pdf.encrypt({
          userPassword: 'mypassword123',
          ownerPassword: 'ownerpass456',
        });
        outputBytes = await pdf.save();
        outputName = 'locked.pdf';
      }
      else if (toolId === 'unlock') {
        let pdf;
        try {
          pdf = await PDFDocument.load(buffers[0], { password: 'mypassword123' });
        } catch {
          pdf = await PDFDocument.load(buffers[0]);
        }
        setProgress(50);
        outputBytes = await pdf.save();
        outputName = 'unlocked.pdf';
      }
      else if (toolId === 'jpg-to-pdf') {
        const pdf = await PDFDocument.create();
        
        for (let i = 0; i < buffers.length; i++) {
          const bytes = buffers[i];
          let image;
          
          if (bytes[0] === 0x89 && bytes[1] === 0x50) {
            image = await pdf.embedPng(bytes);
          } else {
            image = await pdf.embedJpg(bytes);
          }
          
          const page = pdf.addPage([595, 842]);
          const dims = image.scale(1);
          const scale = Math.min(555 / dims.width, 802 / dims.height);
          
          page.drawImage(image, {
            x: (595 - dims.width * scale) / 2,
            y: (842 - dims.height * scale) / 2,
            width: dims.width * scale,
            height: dims.height * scale,
          });
          
          setProgress(20 + Math.round(((i + 1) / buffers.length) * 60));
        }
        outputBytes = await pdf.save();
        outputName = 'images-to-pdf.pdf';
      }
      else if (toolId === 'page-number') {
        const pdf = await PDFDocument.load(buffers[0]);
        const pages = pdf.getPages();
        const font = await pdf.embedFont(StandardFonts.Helvetica);
        
        for (let i = 0; i < pages.length; i++) {
          const page = pages[i];
          const { width } = page.getSize();
          const text = `${i + 1}`;
          
          page.drawText(text, {
            x: width / 2 - 5,
            y: 30,
            size: 11,
            font,
            color: rgb(0.3, 0.3, 0.3),
          });
          
          setProgress(20 + Math.round(((i + 1) / pages.length) * 60));
        }
        outputBytes = await pdf.save();
        outputName = 'numbered.pdf';
      }
      else if (toolId === 'crop') {
        const pdf = await PDFDocument.load(buffers[0]);
        const pages = pdf.getPages();
        
        for (let i = 0; i < pages.length; i++) {
          const page = pages[i];
          const { width, height } = page.getSize();
          page.setCropBox(25, 25, width - 25, height - 25);
          setProgress(20 + Math.round(((i + 1) / pages.length) * 60));
        }
        outputBytes = await pdf.save();
        outputName = 'cropped.pdf';
      }
      else {
        throw new Error('Unknown tool');
      }

      setProgress(90);
      
      const blob = new Blob([outputBytes], { type: toolId === 'split' ? 'application/zip' : 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      setResultUrl(url);
      setResultName(outputName);
      setProgress(100);
      
    } catch (err) {
      console.error(err);
      setError('Processing failed: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    setTool(null);
    setFiles([]);
    setResultUrl(null);
    setResultName('');
    setError('');
    setProgress(0);
  };

  const styles = {
    container: {
      maxWidth: '850px',
      margin: '0 auto',
      padding: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      minHeight: '100vh',
    },
    header: {
      textAlign: 'center',
      padding: '30px 0 10px',
    },
    title: {
      fontSize: '28px',
      fontWeight: '800',
      color: '#1e293b',
      margin: '0 0 5px',
    },
    subtitle: {
      color: '#64748b',
      fontSize: '15px',
      margin: 0,
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))',
      gap: '12px',
      marginTop: '20px',
    },
    toolCard: {
      background: 'white',
      border: '2px solid #e2e8f0',
      borderRadius: '14px',
      padding: '20px 15px',
      cursor: 'pointer',
      textAlign: 'center',
      transition: 'all 0.2s ease',
    },
    toolIcon: {
      fontSize: '34px',
      marginBottom: '8px',
    },
    toolName: {
      fontWeight: '700',
      fontSize: '14px',
      color: '#334155',
    },
    workspace: {
      background: 'white',
      border: '2px solid #e2e8f0',
      borderRadius: '14px',
      padding: '18px',
      marginBottom: '18px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    backBtn: {
      background: '#f1f5f9',
      border: '1px solid #e2e8f0',
      padding: '9px 18px',
      borderRadius: '8px',
      cursor: 'pointer',
      fontWeight: '600',
      fontSize: '14px',
      color: '#475569',
    },
    dropzone: {
      border: '3px dashed #cbd5e1',
      borderRadius: '16px',
      padding: '45px 20px',
      textAlign: 'center',
      background: 'white',
      cursor: 'pointer',
      marginBottom: '18px',
      transition: 'all 0.2s',
    },
    dropzoneActive: {
      borderColor: '#3b82f6',
      background: '#eff6ff',
    },
    dropIcon: {
      fontSize: '42px',
      marginBottom: '10px',
    },
    dropText: {
      fontSize: '16px',
      fontWeight: '600',
      color: '#334155',
      marginBottom: '5px',
    },
    dropSubtext: {
      color: '#94a3b8',
      fontSize: '13px',
    },
    errorBox: {
      background: '#fef2f2',
      border: '1px solid #fecaca',
      color: '#dc2626',
      padding: '12px 16px',
      borderRadius: '10px',
      marginBottom: '15px',
      fontSize: '14px',
    },
    fileList: {
      background: 'white',
      border: '1px solid #e2e8f0',
      borderRadius: '12px',
      padding: '14px',
      marginBottom: '15px',
    },
    fileItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '7px 0',
      borderBottom: '1px solid #f1f5f9',
      fontSize: '14px',
    },
    progressBar: {
      height: '8px',
      background: '#e2e8f0',
      borderRadius: '10px',
      overflow: 'hidden',
      marginBottom: '6px',
    },
    progressFill: {
      height: '100%',
      background: '#3b82f6',
      borderRadius: '10px',
      transition: 'width 0.3s ease',
    },
    processBtn: {
      width: '100%',
      padding: '16px',
      background: '#3b82f6',
      color: 'white',
      border: 'none',
      borderRadius: '12px',
      fontSize: '16px',
      fontWeight: '700',
      cursor: 'pointer',
      marginBottom: '15px',
    },
    successBox: {
      textAlign: 'center',
      padding: '20px',
    },
    downloadBtn: {
      display: 'inline-block',
      padding: '15px 40px',
      background: '#10b981',
      color: 'white',
      borderRadius: '12px',
      textDecoration: 'none',
      fontSize: '16px',
      fontWeight: '700',
      marginTop: '10px',
    },
    footer: {
      textAlign: 'center',
      padding: '30px 0',
      color: '#94a3b8',
      fontSize: '13px',
      borderTop: '1px solid #f1f5f9',
      marginTop: '40px',
    },
  };

  return (
    <div style={styles.container}>
      
      <div style={styles.header}>
        <h1 style={styles.title}>📄 PDF Tools</h1>
        <p style={styles.subtitle}>Free • Browser-based • No uploads needed</p>
      </div>

      {!tool ? (
        <div style={styles.grid}>
          {TOOLS.map(t => (
            <div
              key={t.id}
              style={styles.toolCard}
              onClick={() => setTool(t)}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.transform = 'none'; }}
            >
              <div style={styles.toolIcon}>{t.icon}</div>
              <div style={styles.toolName}>{t.name}</div>
            </div>
          ))}
        </div>
      ) : (
        <>
          <div style={styles.workspace}>
            <div>
              <span style={{ fontSize: '26px', marginRight: '8px' }}>{tool.icon}</span>
              <span style={{ fontWeight: '700', fontSize: '16px', color: '#1e293b' }}>{tool.name}</span>
            </div>
            <button style={styles.backBtn} onClick={reset}>← All Tools</button>
          </div>

          <div {...getRootProps()} style={{ ...styles.dropzone, ...(isDragActive ? styles.dropzoneActive : {}) }}>
            <input {...getInputProps()} />
            <div style={styles.dropIcon}>📁</div>
            <div style={styles.dropText}>
              {isDragActive ? 'Drop files here...' : 'Drag & drop or tap to select'}
            </div>
            <div style={styles.dropSubtext}>
              {tool.multi ? 'Multiple files • ' : 'Single file • '}Max 50MB
            </div>
          </div>

          {error && <div style={styles.errorBox}>⚠️ {error}</div>}

          {files.length > 0 && !resultUrl && (
            <div style={styles.fileList}>
              <div style={{ fontWeight: '700', marginBottom: '8px', fontSize: '14px', color: '#334155' }}>
                {files.length} file{files.length > 1 ? 's' : ''} selected
              </div>
              {files.map((f, i) => (
                <div key={i} style={styles.fileItem}>
                  <span>📄</span>
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.name}</span>
                  <span style={{ color: '#94a3b8', fontSize: '12px' }}>{(f.size / 1024 / 1024).toFixed(2)} MB</span>
                </div>
              ))}
            </div>
          )}

          {loading && (
            <div style={{ marginBottom: '15px' }}>
              <div style={styles.progressBar}>
                <div style={{ ...styles.progressFill, width: `${progress}%` }} />
              </div>
              <div style={{ textAlign: 'center', fontSize: '13px', color: '#64748b', marginTop: '5px' }}>
                Processing... {progress}%
              </div>
            </div>
          )}

          {files.length > 0 && !loading && !resultUrl && (
            <button style={styles.processBtn} onClick={processFiles}>
              Process {tool.name}
            </button>
          )}

          {resultUrl && (
            <div style={styles.successBox}>
              <div style={{ fontSize: '18px', fontWeight: '700', color: '#10b981', marginBottom: '12px' }}>
                ✅ Ready!
              </div>
              <a href={resultUrl} download={resultName} style={styles.downloadBtn}>
                📥 Download {resultName}
              </a>
              <br /><br />
              <button style={styles.backBtn} onClick={reset}>Process Another</button>
            </div>
          )}
        </>
      )}

      <div style={styles.footer}>
        🔒 All processing happens in your browser • Files never leave your device
      </div>
    </div>
  );
        }
