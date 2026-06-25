"use client";

import React, { useState, useRef, useEffect } from "react";

function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function MediaAudio({ src, className }) {
  const audioRef = useRef(null);
  const [status, setStatus] = useState(src ? "loading" : "unavailable");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    setStatus(src ? "loading" : "unavailable");
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, [src]);

  if (!src || status === "unavailable" || status === "error") {
    return (
      <div className={`flex items-center justify-center bg-slate-950 border border-slate-800 text-slate-400 text-sm font-bold uppercase tracking-wide p-6 min-h-[100px] ${className || ""}`}>
        Audio unavailable
      </div>
    );
  }

  const togglePlay = () => {
    const el = audioRef.current;
    if (!el) return;
    if (isPlaying) el.pause();
    else el.play().catch(() => setStatus("error"));
  };

  return (
    <div className={`flex flex-col gap-3 p-4 bg-slate-950 border border-slate-800 min-h-[100px] ${className || ""}`}>
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onLoadedMetadata={() => {
          setDuration(audioRef.current?.duration || 0);
          setStatus("ready");
        }}
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onError={() => setStatus("error")}
        className="hidden"
      />
      {status === "loading" && (
        <span className="text-xs text-slate-500 font-bold uppercase animate-pulse">Loading audio...</span>
      )}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={togglePlay}
          disabled={status === "loading"}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-black w-11 h-11 flex items-center justify-center rounded-full transition-transform active:scale-95 cursor-pointer text-lg flex-shrink-0 shadow-lg"
        >
          {isPlaying ? "⏸" : "▶"}
        </button>
        <div className="flex-1 flex flex-col gap-1.5">
          <input
            type="range"
            min="0"
            max={duration || 100}
            value={currentTime}
            onChange={(e) => {
              const t = Number(e.target.value);
              if (audioRef.current) audioRef.current.currentTime = t;
              setCurrentTime(t);
            }}
            className="w-full h-2 bg-slate-700 accent-blue-500 rounded-lg cursor-pointer outline-none"
          />
          <div className="flex justify-between text-xs text-slate-400 font-mono font-semibold">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
