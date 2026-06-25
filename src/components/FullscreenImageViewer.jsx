"use client";

import React, { useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

export default function FullscreenImageViewer({ url, zoomScale, onZoomChange, onClose }) {
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (!url) return;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [url, handleKeyDown]);

  if (!url || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fullscreen-image-viewer fixed inset-0 flex flex-col select-none"
      style={{ zIndex: 99999, background: "rgba(2, 8, 23, 0.97)" }}
      role="dialog"
      aria-modal="true"
      aria-label="Evidence image viewer"
    >
      <div className="flex items-center justify-between px-6 py-4 bg-slate-950/90 border-b border-slate-800 flex-shrink-0">
        <span className="text-slate-200 text-base font-black uppercase tracking-widest">Evidence Image Viewer</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onZoomChange(Math.max(0.25, zoomScale - 0.25))}
            className="ds-btn ds-btn-secondary px-4 py-2.5 text-sm cursor-pointer"
          >
            − Zoom Out
          </button>
          <span className="text-slate-400 text-sm font-mono w-16 text-center font-bold bg-slate-900 border border-slate-700 py-2.5 rounded">
            {Math.round(zoomScale * 100)}%
          </span>
          <button
            type="button"
            onClick={() => onZoomChange(1)}
            className="ds-btn ds-btn-secondary px-4 py-2.5 text-sm cursor-pointer"
          >
            1:1
          </button>
          <button
            type="button"
            onClick={() => onZoomChange(Math.min(4, zoomScale + 0.25))}
            className="ds-btn ds-btn-secondary px-4 py-2.5 text-sm cursor-pointer"
          >
            + Zoom In
          </button>
          <div className="w-px h-7 bg-slate-700 mx-1" />
          <button
            type="button"
            onClick={onClose}
            className="ds-btn ds-btn-danger px-5 py-2.5 text-sm cursor-pointer"
          >
            ✕ Close
          </button>
        </div>
      </div>

      <div
        className="flex-1 flex items-center justify-center overflow-auto cursor-zoom-out p-4"
        onClick={onClose}
      >
        <MediaImageInner url={url} zoomScale={zoomScale} />
      </div>

      <div className="flex-shrink-0 py-3 flex items-center justify-center bg-slate-950/80 border-t border-slate-800">
        <span className="text-slate-500 text-sm">
          Press <kbd className="bg-slate-800 px-2 py-0.5 text-slate-300 font-mono text-xs rounded mx-1">Esc</kbd> or click outside to close
        </span>
      </div>
    </div>,
    document.body
  );
}

function MediaImageInner({ url, zoomScale }) {
  const [failed, setFailed] = React.useState(false);

  if (failed) {
    return (
      <div className="text-slate-400 text-base font-bold uppercase tracking-wide p-12 border-2 border-slate-700 bg-slate-900 rounded-lg">
        Image unavailable
      </div>
    );
  }

  return (
    <img
      src={url}
      alt="Evidence fullscreen"
      className="object-contain shadow-2xl border border-slate-700 cursor-default rounded-lg"
      style={{
        transform: `scale(${zoomScale})`,
        transition: "transform 0.15s ease-out",
        maxWidth: "90vw",
        maxHeight: "80vh",
      }}
      onClick={(e) => e.stopPropagation()}
      onError={() => setFailed(true)}
    />
  );
}
