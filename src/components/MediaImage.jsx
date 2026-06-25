"use client";

import React, { useState } from "react";

export default function MediaImage({ src, alt, className, onClick, thumbnail }) {
  const [status, setStatus] = useState("loading");

  if (!src) {
    return (
      <div className={`flex items-center justify-center bg-slate-950 border border-slate-800 text-slate-500 text-sm font-bold uppercase tracking-wide p-4 ${className || ""}`}>
        Image unavailable
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className={`flex flex-col items-center justify-center bg-slate-950 border border-slate-800 text-slate-400 text-sm font-bold uppercase tracking-wide p-4 text-center gap-1 ${className || ""}`}>
        <span>Image unavailable</span>
        {!thumbnail && (
          <span className="text-xs font-normal normal-case text-slate-500">The file may have been removed or is inaccessible</span>
        )}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt || "Evidence"}
      className={className}
      onClick={onClick}
      onLoad={() => setStatus("loaded")}
      onError={() => setStatus("error")}
      style={status === "loading" ? { opacity: 0.4 } : undefined}
    />
  );
}
