import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ZoomIn, ZoomOut, RotateCw, RefreshCw } from 'lucide-react';

export default function ImageLightbox({ src, title, onClose }) {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.3, 4));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.3, 0.5));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);
  const handleReset = () => { setScale(1); setRotation(0); };

  if (!src) return null;

  return createPortal(
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      width: '100vw', height: '100vh',
      background: 'rgba(15, 23, 42, 0.85)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      zIndex: 999999,
      animation: 'fadeIn 0.2s ease-out',
    }} onClick={onClose}>
      
      {/* Lightbox Controls Header */}
      <div style={{
        position: 'absolute', top: '1.5rem', left: '1.5rem', right: '1.5rem',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        zIndex: 2001,
      }} onClick={e => e.stopPropagation()}>
        <div style={{ color: '#ffffff', fontWeight: 600, fontSize: '1rem', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
          {title || 'Photo Viewer'}
        </div>

        {/* Toolbar */}
        <div style={{
          display: 'flex', gap: '0.5rem', background: 'rgba(255,255,255,0.15)',
          backdropFilter: 'blur(10px)', padding: '0.4rem 0.75rem',
          borderRadius: '99px', border: '1px solid rgba(255,255,255,0.2)',
        }}>
          <button onClick={handleZoomIn} title="Zoom In" style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', padding: '4px' }}>
            <ZoomIn size={18} />
          </button>
          <button onClick={handleZoomOut} title="Zoom Out" style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', padding: '4px' }}>
            <ZoomOut size={18} />
          </button>
          <button onClick={handleRotate} title="Rotate 90°" style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', padding: '4px' }}>
            <RotateCw size={18} />
          </button>
          <button onClick={handleReset} title="Reset View" style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', padding: '4px' }}>
            <RefreshCw size={18} />
          </button>
          <div style={{ width: '1px', background: 'rgba(255,255,255,0.3)', margin: '0 4px' }} />
          <button onClick={onClose} title="Close (Esc)" style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', padding: '4px' }}>
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Image Preview Container */}
      <div 
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          maxWidth: '90vw', maxHeight: '80vh', overflow: 'hidden',
          transition: 'transform 0.15s ease-out',
        }}
        onClick={e => e.stopPropagation()}
      >
        <img
          src={src}
          alt={title || 'Full View'}
          style={{
            maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain',
            borderRadius: '12px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
            transform: `scale(${scale}) rotate(${rotation}deg)`,
            transition: 'transform 0.2s ease-out',
            userSelect: 'none',
          }}
        />
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>,
    document.body
  );
}
