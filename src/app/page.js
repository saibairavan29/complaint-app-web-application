"use client";

import React, { useState, useEffect, useRef } from "react";
import { projectsData, locationsData } from "../data/projects";
import { translations } from "../translations";
import SearchableSelect from "../components/SearchableSelect";
import { getTranslatedProjectName } from "../utils/translationHelper";

const BACKEND_URL = (process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000").replace(/\/$/, "");

// WAV encoder helper functions
function encodeWAV(samples, sampleRate) {
  let totalLength = 0;
  for (let i = 0; i < samples.length; i++) {
    totalLength += samples[i].length;
  }
  const mergedSamples = new Float32Array(totalLength);
  let offset = 0;

  for (let i = 0; i < samples.length; i++) {
    mergedSamples.set(samples[i], offset);
    offset += samples[i].length;
  }

  const buffer = new ArrayBuffer(44 + mergedSamples.length * 2);
  const view = new DataView(buffer);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + mergedSamples.length * 2, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, mergedSamples.length * 2, true);

  floatTo16BitPCM(view, 44, mergedSamples);

  return new Blob([view], { type: 'audio/wav' });
}

function floatTo16BitPCM(output, offset, input) {
  for (let i = 0; i < input.length; i++, offset += 2) {
    let s = Math.max(-1, Math.min(1, input[i]));
    output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
}

function writeString(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

function SpeechPreviewSkeleton() {
  return (
    <div className="w-full flex flex-col gap-4 animate-pulse">
      {/* 4 Metadata Cards Pulses */}
      <div className="grid grid-cols-2 gap-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-slate-200 border-2 border-slate-350 p-2.5 h-14"></div>
        ))}
      </div>
      {/* Original Speech Pulse */}
      <div className="bg-slate-200 border-2 border-slate-350 p-4 h-20"></div>
      {/* Translation Pulse */}
      <div className="bg-slate-300 border-2 border-slate-400 p-4 h-20"></div>
    </div>
  );
}

export default function Home() {
  // Navigation & Localization Screen States
  const [screen, setScreen] = useState("lang"); // "lang" | "form" | "success"
  const [lang, setLang] = useState("en"); // "en" | "hi" | "ta" | "te" | "mr" | "or"
  const [isHydrated, setIsHydrated] = useState(false);

  // Master Data State (Fetched from Django API or Fallback)
  const [projectsList, setProjectsList] = useState([]);
  const [locationsList, setLocationsList] = useState([]);
  const [isUsingFallback, setIsUsingFallback] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [loadingLocations, setLoadingLocations] = useState(false);

  // Form State
  const [selectedProject, setSelectedProject] = useState(""); // Stores name or ID
  const [selectedLocation, setSelectedLocation] = useState(""); // Stores name or ID
  const [selectedBusinessUnit, setSelectedBusinessUnit] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [photoUrl, setPhotoUrl] = useState("");
  const [validationError, setValidationError] = useState("");
  const [fileValidationError, setFileValidationError] = useState("");

  // Audio Recorder State
  const [recordingState, setRecordingState] = useState("idle"); // "idle" | "recording" | "saved" | "playing"
  const [engineState, setEngineState] = useState("starting"); // "starting" | "ready" | "error"
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState("");
  const [audioBlob, setAudioBlob] = useState(null);

  // Phase 3 Uploading / Submitting Progress States
  const [uploadingState, setUploadingState] = useState("idle"); // 'idle' | 'validating' | 'uploading_photo' | 'uploading_audio' | 'submitting_api' | 'failed'
  const [mediaReminderType, setMediaReminderType] = useState(null); // null | 'both_missing' | 'one_missing'

  // Photo & Audio Upload Progress tracking
  const [photoUploadProgress, setPhotoUploadProgress] = useState(0);
  const [photoUploadStatus, setPhotoUploadStatus] = useState("idle"); // 'idle' | 'uploading' | 'uploaded' | 'failed'
  const [photoCloudinaryUrl, setPhotoCloudinaryUrl] = useState("");

  const [audioUploadProgress, setAudioUploadProgress] = useState(0);
  const [audioUploadStatus, setAudioUploadStatus] = useState("idle"); // 'idle' | 'uploading' | 'uploaded' | 'failed'
  const [audioCloudinaryUrl, setAudioCloudinaryUrl] = useState("");

  // Final Success details
  const [successDetails, setSuccessDetails] = useState(null);

  // Phase 5.6 & Phase 6 Review speech preview integration states
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewTranscript, setPreviewTranscript] = useState("");
  const [previewTranslation, setPreviewTranslation] = useState("");
  const [previewDetectedLanguage, setPreviewDetectedLanguage] = useState("");
  const [previewTranscriptConfidence, setPreviewTranscriptConfidence] = useState(null);
  const [previewTranslationConfidence, setPreviewTranslationConfidence] = useState(null);
  const [previewLanguagePair, setPreviewLanguagePair] = useState("");
  const [previewProcessingTime, setPreviewProcessingTime] = useState(null);
  const [previewState, setPreviewState] = useState("idle"); // "idle" | "recording_complete" | "uploading" | "transcribing" | "translating" | "ready" | "error"
  const [previewError, setPreviewError] = useState("");
  const [isManualFallback, setIsManualFallback] = useState(false);
  const [manualComplaintText, setManualComplaintText] = useState("");
  const [playbackEnded, setPlaybackEnded] = useState(false);

  // Refs
  const audioContextRef = useRef(null);
  const audioWorkletNodeRef = useRef(null);
  const streamRef = useRef(null);
  const samplesRef = useRef([]);
  const recordingStateRef = useRef("idle");
  const timerRef = useRef(null);
  const audioPlayerRef = useRef(null);
  const fileInputRef = useRef(null);
  const timerDisplayRef = useRef(null);
  const recordingStartTimestampRef = useRef(null);
  const recordingStopTimestampRef = useRef(null);
  const overflowCountRef = useRef(0);
  const rollingBufferRef = useRef([]);
  const rollingBufferSamplesCountRef = useRef(0);
  const recordingEnabledRef = useRef(false);
  const engineStateRef = useRef("starting");
  const callbackIntervalsRef = useRef([]);


  // Translation Dictionary Shortcut
  const t = translations[lang] || translations.en;

  // Cloudinary Parameters from next.config or process.env
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "demo_cloud";
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "demo_preset";

  // Bilingual Helper
  const getBilingualName = (obj) => {
    return getTranslatedProjectName(obj, lang);
  };

  // Language-First: always show language selection on page load.
  // Uses sessionStorage (not localStorage) so language persists within the
  // same browser session but resets on a new tab / page refresh.
  useEffect(() => {
    const sessionLang = sessionStorage.getItem("worker_lang_session");
    if (sessionLang) {
      setLang(sessionLang);
    }
    // Always open the language selection screen first — no auto-bypass.
    setScreen("lang");
    setIsHydrated(true);
    fetchProjects();

    return () => {
      cleanupAudioEngine();
    };
  }, []);

  const fetchProjects = async () => {
    setLoadingProjects(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/projects/`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setProjectsList(data);
          setIsUsingFallback(false);
          return;
        }
      }
      throw new Error("Empty or invalid project endpoint payload");
    } catch (err) {
      console.warn("Backend API unavailable. Falling back to local company projects list.", err);
      // Map local project object list
      const fallbackList = projectsData.map((p, index) => ({
        id: `fallback-${index}`,
        name: p.name,
        business_unit: p.business_unit || "",
        localized_names: p.localized_names,
        is_active: true
      }));
      setProjectsList(fallbackList);
      setIsUsingFallback(true);
    } finally {
      setLoadingProjects(false);
    }
  };

  // Fetch Locations dynamically when project is selected
  useEffect(() => {
    if (!selectedProject) {
      setLocationsList([]);
      setSelectedLocation("");
      setSelectedBusinessUnit("");
      return;
    }
    const matched = projectsList.find((p) => String(p.id) === String(selectedProject));
    setSelectedBusinessUnit(matched?.business_unit || "");
    fetchLocations(selectedProject);
  }, [selectedProject, projectsList]);

  const fetchLocations = async (projectVal) => {
    // Check if we are using fallback or if projectVal is a fallback string ID
    if (isUsingFallback || String(projectVal).startsWith("fallback-")) {
      const fallbackLocs = locationsData.map((loc, index) => ({
        id: `fallback-loc-${index}`,
        name: loc.name,
        localized_names: loc.localized_names,
        project: projectVal,
        is_active: true
      }));
      setLocationsList(fallbackLocs);
      return;
    }

    setLoadingLocations(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/projects/${projectVal}/locations/`);
      if (res.ok) {
        const data = await res.json();
        setLocationsList(data);
      } else {
        throw new Error("Unable to load locations from Django server");
      }
    } catch (err) {
      console.warn("Locations endpoint failed. Using fallback locations list.", err);
      const fallbackLocs = locationsData.map((loc, index) => ({
        id: `fallback-loc-${index}`,
        name: loc.name,
        localized_names: loc.localized_names,
        project: projectVal,
        is_active: true
      }));
      setLocationsList(fallbackLocs);
    } finally {
      setLoadingLocations(false);
    }
  };

  // Update document language dynamically
  useEffect(() => {
    if (typeof document !== "undefined" && document.documentElement) {
      document.documentElement.lang = lang;
    }
  }, [lang]);

  // Cleanup local file URLs on unmount
  useEffect(() => {
    return () => {
      if (photoUrl) URL.revokeObjectURL(photoUrl);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [photoUrl, audioUrl]);

  // Audio timer ticker removed to avoid state re-renders during recording


  // Handle Voice Recording using Web Audio API (Compile direct to 16-bit WAV)
  const cleanupAudioEngine = () => {
    if (audioWorkletNodeRef.current) {
      try {
        audioWorkletNodeRef.current.disconnect();
      } catch (e) {
        console.warn("Error disconnecting AudioWorkletNode:", e);
      }
      audioWorkletNodeRef.current = null;
    }
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach((track) => track.stop());
      } catch (e) {
        console.warn("Error stopping stream tracks:", e);
      }
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch (e) {
        console.warn("Error closing AudioContext:", e);
      }
      audioContextRef.current = null;
    }
  };

  const initializeAudioEngine = async () => {
    if (audioContextRef.current) {
      return;
    }

    setEngineState("starting");
    engineStateRef.current = "starting";

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          sampleRate: 48000,
          sampleSize: 16,
          latency: 0,
          voiceIsolation: false
        }
      });

      streamRef.current = stream;

      const track = stream.getAudioTracks()[0];
      if (track) {
        const settings = track.getSettings();

        console.log("Resolved Sample Rate:", settings.sampleRate);
        console.log("Resolved Sample Size:", settings.sampleSize);
        console.log("Resolved Channel Count:", settings.channelCount);
        console.log("Resolved Echo Cancellation:", settings.echoCancellation);
        console.log("Resolved Noise Suppression:", settings.noiseSuppression);
        console.log("Resolved Auto Gain Control:", settings.autoGainControl);
        console.log("Resolved Latency:", settings.latency);
        console.log("Resolved Device:", settings.deviceId);

        // Verify the browser didn't ignore constraints
        const checks = [
          { name: "sampleRate", label: "Sample Rate", requested: 48000 },
          { name: "sampleSize", label: "Sample Size", requested: 16 },
          { name: "channelCount", label: "Channel Count", requested: 1 },
          { name: "echoCancellation", label: "Echo Cancellation", requested: false },
          { name: "noiseSuppression", label: "Noise Suppression", requested: false },
          { name: "autoGainControl", label: "Auto Gain Control", requested: false }
        ];

        checks.forEach(check => {
          const resolved = settings[check.name];
          if (resolved !== undefined && resolved !== check.requested) {
            console.log(
              `Browser ignored requested microphone constraint:\n${check.name}\nRequested:\n${check.requested}\nResolved:\n${resolved}`
            );
          }
        });
      }

      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      const audioContext = new AudioContextClass();
      audioContextRef.current = audioContext;

      console.log("audioContext.sampleRate:", audioContext.sampleRate);
      console.log("audioContext.baseLatency:", audioContext.baseLatency);
      console.log("audioContext.outputLatency:", audioContext.outputLatency);
      console.log("audioContext.state:", audioContext.state);

      if (audioContext.state === "suspended") {
        await audioContext.resume().catch(e => console.warn("Failed to resume AudioContext on init:", e));
      }

      const source = audioContext.createMediaStreamSource(stream);

      console.log("MediaStreamSource channelCount:", source.channelCount);
      console.log("MediaStreamSource channelCountMode:", source.channelCountMode);

      audioContext.source = source; // Prevent garbage collection

      await audioContext.audioWorklet.addModule('/recorder-processor.js');

      const recorderNode = new AudioWorkletNode(audioContext, 'recorder-processor');
      audioWorkletNodeRef.current = recorderNode;

      let lastMessageTime = Date.now();
      const expectedIntervalMs = (4096 / audioContext.sampleRate) * 1000;
      const maxRollingSamples = audioContext.sampleRate * 2; // 2 seconds

      // Accumulate Float32 PCM chunks
      recorderNode.port.onmessage = (event) => {
        const { type, samples } = event.data;

        if (type === "samples") {
          const now = Date.now();
          const interval = now - lastMessageTime;
          lastMessageTime = now;

          // Event loop lag check
          if (interval > 1000) {
            console.warn(`Recording pipeline warning: main thread message processing latency detected (${interval.toFixed(1)} ms).`);
            overflowCountRef.current += 1;
          }

          // Slicing Invariant: Deep copy using slice for both collections to prevent shared reference bugs
          if (recordingEnabledRef.current) {
            samplesRef.current.push(samples.slice());
            callbackIntervalsRef.current.push(interval);
          }

          const copiedChunk = samples.slice();
          rollingBufferRef.current.push(copiedChunk);
          rollingBufferSamplesCountRef.current += copiedChunk.length;
          while (rollingBufferSamplesCountRef.current > maxRollingSamples) {
            const removed = rollingBufferRef.current.shift();
            rollingBufferSamplesCountRef.current -= removed.length;
          }
        } else if (type === "done") {
          if (recorderNode._flushResolve) {
            recorderNode._flushResolve();
          }
        }
      };

      // Audio graph: mic → worklet → silent sink (keeps AudioContext alive).
      const silentGain = audioContext.createGain();
      silentGain.gain.value = 0;

      source.connect(recorderNode);
      recorderNode.connect(silentGain);
      silentGain.connect(audioContext.destination);

      setEngineState("ready");
      engineStateRef.current = "ready";
    } catch (err) {
      console.error("Microphone access or AudioContext initialization error:", err);
      setEngineState("error");
      engineStateRef.current = "error";
      cleanupAudioEngine();
    }
  };

  // Handle Voice Recording using Web Audio API (Compile direct to 16-bit WAV)
  const startRecording = async () => {
    window.__firstAudioBufferLogged = false;
    setPlaybackEnded(false);
    setFileValidationError("");
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl("");
      setAudioBlob(null);
    }

    if (!audioContextRef.current) {
      await initializeAudioEngine();
      if (engineStateRef.current === "error") {
        alert("Microphone permission denied or not supported on this device.");
        return;
      }
    }

    // Resume AudioContext if suspended
    if (audioContextRef.current && audioContextRef.current.state === "suspended") {
      await audioContextRef.current.resume().catch(e => console.warn("Failed to resume AudioContext:", e));
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    samplesRef.current.length = 0;
    callbackIntervalsRef.current.length = 0;
    overflowCountRef.current = 0;
    setRecordingDuration(0);

    setRecordingState("preparing");
    recordingStateRef.current = "preparing";

    recordingStartTimestampRef.current = Date.now();

    // Copy pre-roll first, then enable recording to remove any race condition
    const preRoll = rollingBufferRef.current.map(chunk => chunk.slice());
    samplesRef.current.push(...preRoll);
    recordingEnabledRef.current = true;

    // Set timeout for minimum 1000 ms to perform pure UI update
    setTimeout(() => {
      if (recordingStateRef.current === "preparing") {

        setRecordingState("recording");
        recordingStateRef.current = "recording";

        if (timerDisplayRef.current) {
          timerDisplayRef.current.innerText = formatTime(0);
        }

        if (timerRef.current) {
          clearInterval(timerRef.current);
        }

        let localSeconds = 0;
        timerRef.current = setInterval(() => {
          localSeconds += 1;

          if (timerDisplayRef.current) {
            timerDisplayRef.current.innerText = formatTime(localSeconds);
          }

          if (localSeconds >= 300) {
            stopRecording();
          }
        }, 1000);
      }
    }, 1000);
  };


  const stopRecording = async () => {
    if (recordingStateRef.current !== "recording" && recordingStateRef.current !== "preparing") return;

    recordingStateRef.current = "saved";
    setRecordingState("saved");
    setPlaybackEnded(false);

    const actualSampleRate = audioContextRef.current ? audioContextRef.current.sampleRate : 16000;

    const stopTime = Date.now();
    recordingStopTimestampRef.current = stopTime;
    const elapsedSeconds = (stopTime - recordingStartTimestampRef.current) / 1000;

    const timeout = (ms) => new Promise((resolve) => setTimeout(() => resolve("timeout"), ms));

    // Wait for the done message before setting recordingEnabledRef to false
    if (audioWorkletNodeRef.current) {
      const node = audioWorkletNodeRef.current;
      const flushPromise = new Promise((resolve) => {
        node._flushResolve = resolve;
        node.port.postMessage({ type: "flush" });
      });

      const flushResult = await Promise.race([
        flushPromise.then(() => "flushed"),
        timeout(500).then(() => "timeout")
      ]);

      if (flushResult === "timeout") {
        console.warn("AudioWorklet flush timed out after 500 ms.");
      }
      node._flushResolve = null;
    }

    // Disable recording flag after flush completes to capture the final render quantum
    recordingEnabledRef.current = false;

    const totalSamples = samplesRef.current.reduce((acc, s) => acc + s.length, 0);
    const calculatedDuration = totalSamples / actualSampleRate;

    const merged = new Float32Array(totalSamples);
    let offset = 0;
    for (const chunk of samplesRef.current) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }

    let peakAmplitude = 0;
    let minVal = 0;
    let maxVal = 0;
    let sumOfSquares = 0;
    let totalSampleCount = 0;
    for (let i = 0; i < samplesRef.current.length; i++) {
      const chunk = samplesRef.current[i];
      totalSampleCount += chunk.length;
      for (let j = 0; j < chunk.length; j++) {
        const val = chunk[j];
        if (val > maxVal) maxVal = val;
        if (val < minVal) minVal = val;
        const absVal = Math.abs(val);
        if (absVal > peakAmplitude) peakAmplitude = absVal;
        sumOfSquares += val * val;
      }
    }

    const rmsLevel = totalSampleCount > 0 ? Math.sqrt(sumOfSquares / totalSampleCount) : 0;

    let minInterval = Infinity;
    let maxInterval = -Infinity;
    let sumIntervals = 0;
    const intervals = callbackIntervalsRef.current;

    if (intervals.length > 0) {
      for (const val of intervals) {
        if (val < minInterval) minInterval = val;
        if (val > maxInterval) maxInterval = val;
        sumIntervals += val;
      }
    }

    const avgInterval = intervals.length > 0 ? (sumIntervals / intervals.length) : 0;

    // Enforce 1.5s duration limit
    const durationInSeconds = totalSamples / actualSampleRate;
    if (durationInSeconds < 1.5) {
      setFileValidationError(
        lang === "hi" ? "❌ आवाज की रिकॉर्डिंग कम से कम 1.5 सेकंड की होनी चाहिए।" : "❌ Voice recording must be at least 1.5 seconds."
      );
      deleteRecording();
      return;
    }

    const finalDur = Math.round(durationInSeconds);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (timerDisplayRef.current) {
      timerDisplayRef.current.innerText = formatTime(finalDur);
    }
    setTotalDuration(finalDur);
    setRecordingDuration(finalDur);

    const wavBlob = encodeWAV(samplesRef.current, actualSampleRate);

    const url = URL.createObjectURL(wavBlob);

    setAudioUrl(url);
    setAudioBlob(wavBlob);

    setPreviewState("recording_complete");
    // Trigger real-time preview
    generateSpeechPreview(wavBlob);
  };

  const playAudio = () => {
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audio.currentTime = 0;
      audioPlayerRef.current = audio;
      setRecordingState("playing");
      setRecordingDuration(0);
      setPlaybackEnded(false);

      // Web Audio API playback gain enhancement (Preview boost only, keeps exported WAV raw)
      if (audioContextRef.current) {
        try {
          const ctx = audioContextRef.current;
          if (ctx.state === "suspended") {
            ctx.resume().catch(e => console.warn("Failed to resume AudioContext on playback:", e));
          }
          const source = ctx.createMediaElementSource(audio);
          const gainNode = ctx.createGain();
          gainNode.gain.value = 2.5; // Apply a 2.5x gain boost for preview playback
          source.connect(gainNode);
          gainNode.connect(ctx.destination);
        } catch (e) {
          console.warn("Failed to apply preview playback gain boost via Web Audio API:", e);
        }
      }

      const startPlayback = () => {
        audio.play().catch((err) => {
          console.error("Playback failed:", err);
        });
      };

      audio.addEventListener("canplay", startPlayback, { once: true });

      audio.ontimeupdate = () => {
        setRecordingDuration(Math.floor(audio.currentTime));
      };

      audio.onended = () => {
        setRecordingState("saved");
        setRecordingDuration(totalDuration);
        setPlaybackEnded(true);
      };
    }
  };

  const stopAudioPlayback = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      setRecordingState("saved");
      setRecordingDuration(totalDuration);
    }
  };

  const deleteRecording = () => {
    stopAudioPlayback();
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (timerDisplayRef.current) {
      timerDisplayRef.current.innerText = formatTime(0);
    }
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl("");
      setAudioBlob(null);
    }
    setRecordingDuration(0);
    setTotalDuration(0);
    setPlaybackEnded(false);
    setRecordingState("idle");
    recordingStateRef.current = "idle";
    setAudioUploadProgress(0);
    setAudioUploadStatus("idle");

    setPreviewTranscript("");
    setPreviewTranslation("");
    setPreviewDetectedLanguage("");
    setPreviewTranscriptConfidence(null);
    setPreviewTranslationConfidence(null);
    setPreviewLanguagePair("");
    setPreviewProcessingTime(null);
    setPreviewLoading(false);
    setPreviewState("idle");
    setPreviewError("");
    setIsManualFallback(false);
    setManualComplaintText("");
  };

  const generateSpeechPreview = async (blob) => {
    if (previewLoading) return; // Prevent duplicate requests
    setPreviewLoading(true);
    setPreviewError("");
    setPreviewTranscript("");
    setPreviewTranslation("");
    setPreviewDetectedLanguage("");
    setPreviewTranscriptConfidence(null);
    setPreviewTranslationConfidence(null);
    setPreviewLanguagePair(null);
    setPreviewProcessingTime(null);

    setPreviewState("uploading");

    try {
      const formData = new FormData();
      formData.append("audio", blob, "preview.wav");
      formData.append("language", lang);
      formData.append("category", selectedCategory || "other");

      // Short delay for visual feedback transition
      await new Promise(resolve => setTimeout(resolve, 300));
      setPreviewState("transcribing");

      const transcriptionPromise = fetch(`${BACKEND_URL}/api/complaints/preview-speech/`, {
        method: "POST",
        body: formData,
      });

      // Sequential state updates for visual progression
      let curState = "transcribing";
      const intervalId = setInterval(() => {
        if (curState === "transcribing") {
          curState = "translating";
          setPreviewState("translating");
        } else if (curState === "translating") {
          curState = "finalizing";
          setPreviewState("finalizing");
        }
      }, 1200);

      const res = await transcriptionPromise;
      clearInterval(intervalId);

      if (res.ok) {
        const data = await res.json();
        setPreviewTranscript(data.transcript);
        setPreviewTranslation(data.english_translation);
        setPreviewDetectedLanguage(data.detected_language);
        setPreviewTranscriptConfidence(data.confidence_percentage);
        setPreviewTranslationConfidence(data.translation_confidence);
        setPreviewLanguagePair(data.translation_language_pair);
        setPreviewProcessingTime(data.processing_time_ms);
        setPreviewState("ready");
      } else {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "We could not clearly understand the recording.");
      }
    } catch (err) {
      console.error("Error generating speech preview:", err);
      setPreviewError(err.message || "We could not clearly understand the recording.");
      setPreviewTranscript("");
      setPreviewTranslation("");
      setPreviewDetectedLanguage("");
      setPreviewTranscriptConfidence(null);
      setPreviewTranslationConfidence(null);
      setPreviewLanguagePair(null);
      setPreviewProcessingTime(null);
      setPreviewState("error");
    } finally {
      setPreviewLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Photo Selection
  const handlePhotoSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (photoUrl) {
        URL.revokeObjectURL(photoUrl);
      }
      setPhotoFile(file);
      setPhotoUrl(URL.createObjectURL(file));
      // Reset progress status for new photo
      setPhotoUploadProgress(0);
      setPhotoUploadStatus("idle");
    }
  };

  const removePhoto = () => {
    if (photoUrl) {
      URL.revokeObjectURL(photoUrl);
    }
    setPhotoFile(null);
    setPhotoUrl("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setPhotoUploadProgress(0);
    setPhotoUploadStatus("idle");
  };

  // XMLHttp Cloudinary File Upload Promise
  const performUpload = (file, fileType) => {
    const isPhoto = fileType === "photo";
    const updateProgress = isPhoto ? setPhotoUploadProgress : setAudioUploadProgress;
    const updateStatus = isPhoto ? setPhotoUploadStatus : setAudioUploadStatus;

    return new Promise((resolve, reject) => {
      // Validate configuration. If "demo_preset" or default mock, simulate progress:
      if (cloudName === "demo_cloud" || uploadPreset === "demo_preset") {
        updateStatus("uploading");
        let progress = 0;
        const interval = setInterval(() => {
          progress += 10;
          updateProgress(progress);
          if (progress >= 100) {
            clearInterval(interval);
            updateStatus("uploaded");
            const mockUrl = isPhoto
              ? "https://res.cloudinary.com/demo/image/upload/v1570000000/sample_welfare_photo.jpg"
              : "https://res.cloudinary.com/demo/video/upload/v1570000000/sample_welfare_voice.wav";
            resolve(mockUrl);
          }
        }, 150);
        return;
      }

      // Real Cloudinary Upload using XMLHttpRequest
      updateStatus("uploading");
      const url = `https://api.cloudinary.com/v1_1/${cloudName}/upload`;
      const formData = new FormData();

      // Pass file object or blob
      if (isPhoto) {
        formData.append("file", file);
      } else {
        // Wrap audio blob in a File object with valid WAV extension for Cloudinary compatibility
        const audioFile = new File([file], "complaint_voice.wav", { type: "audio/wav" });
        formData.append("file", audioFile);
      }
      formData.append("upload_preset", uploadPreset);
      formData.append("resource_type", "auto"); // Compatible with webm, wav, mp3

      const xhr = new XMLHttpRequest();
      xhr.open("POST", url, true);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          updateProgress(percent);
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          try {
            const response = JSON.parse(xhr.responseText);
            updateStatus("uploaded");
            resolve(response.secure_url);
          } catch (err) {
            updateStatus("failed");
            reject(new Error("Cloudinary response parsing failed."));
          }
        } else {
          updateStatus("failed");
          reject(new Error(`Cloudinary upload returned status: ${xhr.status}`));
        }
      };

      xhr.onerror = () => {
        updateStatus("failed");
        reject(new Error("Network connection error."));
      };

      xhr.send(formData);
    });
  };

  // Perform Validations
  const validateFiles = () => {
    setFileValidationError("");

    // Validate Photo
    if (photoFile) {
      const allowedPhotoExtensions = ["jpg", "jpeg", "png"];
      const ext = photoFile.name.split(".").pop().toLowerCase();
      if (!allowedPhotoExtensions.includes(ext)) {
        setFileValidationError(t.photoFormatError);
        return false;
      }
      const maxPhotoSize = 10 * 1024 * 1024; // 10MB
      if (photoFile.size > maxPhotoSize) {
        setFileValidationError(t.photoSizeError);
        return false;
      }
    }

    // Validate Audio
    if (audioBlob) {
      // Audio blobs usually don't have file extension in raw type, but we can verify mime-type
      const allowedAudioTypes = ["webm", "wav", "mpeg", "mp3", "ogg", "x-wav"];
      const typeStr = audioBlob.type.toLowerCase();
      const isValidFormat = allowedAudioTypes.some((t) => typeStr.includes(t));
      if (!isValidFormat) {
        setFileValidationError(t.audioFormatError);
        return false;
      }
      const maxAudioSize = 25 * 1024 * 1024; // 25MB
      if (audioBlob.size > maxAudioSize) {
        setFileValidationError(t.audioSizeError);
        return false;
      }
    }

    return true;
  };

  // Submission Pipeline
  const runSubmissionPipeline = async () => {
    setValidationError("");
    setFileValidationError("");

    // 1. Validation Checks
    if (!validateFiles()) {
      setUploadingState("idle");
      return;
    }

    let photoUrlResult = photoCloudinaryUrl;
    let audioUrlResult = audioCloudinaryUrl;

    // 2. Upload Photo (if present and not uploaded yet)
    if (photoFile && photoUploadStatus !== "uploaded") {
      setUploadingState("uploading_photo");
      try {
        photoUrlResult = await performUpload(photoFile, "photo");
        setPhotoCloudinaryUrl(photoUrlResult);
      } catch (err) {
        console.error("Photo upload failed:", err);
        setUploadingState("failed");
        return;
      }
    }

    // 3. Upload Audio (if present and not uploaded yet)
    if (audioBlob && audioUploadStatus !== "uploaded") {
      setUploadingState("uploading_audio");
      try {
        audioUrlResult = await performUpload(audioBlob, "audio");
        setAudioCloudinaryUrl(audioUrlResult);
      } catch (err) {
        console.error("Audio upload failed:", err);
        setUploadingState("failed");
        return;
      }
    }

    // 4. Submit Complaint Payload to Django Backend
    setUploadingState("submitting_api");

    // Resolve names for project and location
    const matchedProjectObj = projectsList.find((p) => String(p.id) === String(selectedProject));
    const matchedLocationObj = locationsList.find((l) => String(l.id) === String(selectedLocation));

    const finalProjectName = matchedProjectObj ? getBilingualName(matchedProjectObj) : selectedProject;
    const finalLocationName = matchedLocationObj ? getBilingualName(matchedLocationObj) : selectedLocation;

    // In a production DRF connection, we submit database IDs if available, else name strings.
    // For resilience, if project ID is local fallback index string, we can mock registration,
    // otherwise we make a real POST to Django!
    const isManual = isManualFallback && !!manualComplaintText.trim();
    const effectiveTranscript = isManual ? manualComplaintText.trim() : (previewTranscript || null);
    const effectiveTranslation = isManual ? manualComplaintText.trim() : (previewTranslation || null);
    const isManualEntry = isManual;
    const postPayload = {
      project: isUsingFallback ? null : Number(selectedProject),
      location: isUsingFallback ? null : Number(selectedLocation),
      category: selectedCategory,
      language: lang,
      photo_url: photoUrlResult || null,
      audio_url: audioUrlResult || null,

      // Phase 5.6 speech preview integration, manual fallback
      transcript: effectiveTranscript,
      english_translation: effectiveTranslation,
      detected_language: isManual ? lang : (previewDetectedLanguage || null),
      transcript_confidence: isManualEntry ? 1.0 : (previewTranscriptConfidence ? (previewTranscriptConfidence / 100.0) : null),
      worker_selected_language: lang,
      translation_confidence: isManualEntry ? 1.0 : (previewTranslationConfidence || null),
      translation_language_pair: isManualEntry ? `${lang}-en` : (previewLanguagePair || null),
      // MANUAL_ENTRY bypasses automatic similarity verification
      translation_verification_result: isManualEntry ? "MANUAL_ENTRY" : "VERIFIED"
    };

    if (isUsingFallback) {
      alert(
        lang === 'hi'
          ? '⚠️ सिस्टम ऑफलाइन है। आपकी शिकायत सहेजी नहीं जा सकती। कृपया इंटरनेट कनेक्शन जांचें और पुनः प्रयास करें।'
          : '⚠️ System is offline. Your complaint could not be saved. Please check your connection and try again.'
      );
      return;
    }

    // Real POST request to Django server
    try {
      const res = await fetch(`${BACKEND_URL}/api/complaints/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(postPayload)
      });

      if (res.ok) {
        const resData = await res.json();
        const serverComplaint = resData.data || {};

        setSuccessDetails({
          referenceNumber: serverComplaint.reference_number || `CMP-${new Date().getFullYear()}-XXXXX`,
          project: finalProjectName,
          location: finalLocationName,
          category: selectedCategory,
          status: serverComplaint.status || "Pending",
          timestamp: serverComplaint.created_at || new Date().toISOString()
        });

        setUploadingState("success");
        setScreen("success");
        window.scrollTo(0, 0);
      } else {
        const errorText = await res.text();
        throw new Error(`Server returned code ${res.status}: ${errorText}`);
      }
    } catch (err) {
      console.error("Complaint registration API failed:", err);
      alert("Failed to save complaint on backend server. Re-enabling submit.");
      setUploadingState("failed");
    }
  };

  // Submit button clicked
  const handleFormSubmit = (e) => {
    e.preventDefault();
    setValidationError("");
    setFileValidationError("");

    // Form input validation
    if (!selectedProject || !selectedLocation || !selectedCategory) {
      setValidationError(t.validationError);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const hasPhoto = !!photoFile;
    const hasVoice = !!audioBlob || (isManualFallback && !!manualComplaintText.trim());

    // Submission is blocked when: No Photo AND No Voice
    if (!hasPhoto && !hasVoice) {
      setValidationError("Please provide a photo, a voice recording, or both before submitting your complaint.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    // Speech safety checks (if audio is present and not using manual fallback)
    if (audioBlob && !isManualFallback) {
      if (previewLoading) {
        setFileValidationError(lang === "hi" ? "❌ कृपया भाषण पूर्वावलोकन पूरा होने की प्रतीक्षा करें।" : "❌ Please wait for speech preview to complete.");
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      if (previewState === "error" || !previewTranscript) {
        setFileValidationError("We could not clearly understand the recording. Please use the manual fallback or record again.");
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
    }

    // Both media are present or allowed configurations, proceed straight to pipeline
    setMediaReminderType(null);
    runSubmissionPipeline();
  };

  // Dialog option: Submit anyway
  const handleProceedAnyway = () => {
    setMediaReminderType(null);
    runSubmissionPipeline();
  };

  // Dialog option: Add missing media
  const handleAddMedia = () => {
    setMediaReminderType(null);
    // Scroll down to upload sections
    const targetElement = document.getElementById("photo-section-anchor");
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Reset form states
  const handleResetForm = () => {
    setSelectedProject("");
    setSelectedLocation("");
    setSelectedCategory("");
    removePhoto();
    deleteRecording();
    setPhotoCloudinaryUrl("");
    setAudioCloudinaryUrl("");
    setUploadingState("idle");
    setValidationError("");
    setFileValidationError("");
    setPreviewTranscript("");
    setPreviewTranslation("");
    setPreviewDetectedLanguage("");
    setPreviewTranscriptConfidence(null);
    setPreviewTranslationConfidence(null);
    setPreviewLanguagePair(null);
    setPreviewProcessingTime(null);
    setPreviewLoading(false);
    setIsManualFallback(false);
    setManualComplaintText("");
    setScreen("form");
  };

  if (!isHydrated) {
    return (
      <div className="flex-1 flex justify-center bg-slate-900 w-full min-h-screen">
        <div className="w-full min-w-[320px] max-w-[600px] bg-slate-900 min-h-screen flex flex-col shadow-2xl relative border-x-4 border-slate-950 items-center justify-center">
          {/* Silent empty layout to prevent English flash */}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex justify-center bg-slate-900 w-full min-h-screen">
      {/* Mobile-first centered frame */}
      <div className="w-full min-w-[320px] max-w-[600px] bg-slate-50 min-h-screen flex flex-col shadow-2xl relative border-x-4 border-slate-950">

        {/* Warning Hazard Stripes */}
        <div className="h-4 bg-hazard-stripes border-b-2 border-slate-950 w-full"></div>

        {/* Dynamic localized Header — ONLY visible if screen is not "lang" */}
        {screen !== "lang" && (
          <header className="bg-safety-yellow text-slate-950 border-b-4 border-slate-950 px-4 py-3 flex flex-col justify-center items-center shadow-md select-none animate-fade-in">
            <div className="flex items-center gap-2">
              <span className="text-3xl font-black">🦺</span>
              <h1 className="text-xl font-extrabold tracking-tight uppercase leading-none">
                {t.title}
              </h1>
            </div>
            <p className="text-[11px] font-bold text-slate-800 tracking-wider text-center mt-1 uppercase">
              {t.subtitle}
            </p>
          </header>
        )}

        {/* Scrollable Main Area */}
        <main className="flex-1 p-4 flex flex-col animate-fade-in pb-24">

          {/* SCREEN 1: LANGUAGE SELECTION */}
          {screen === "lang" && (
            <div className="flex-1 flex flex-col justify-center py-4 animate-fade-in">
              <div className="flex flex-col items-center justify-center mb-8 gap-3">
                <span className="text-5xl animate-bounce">🦺</span>
                <h1 className="text-2xl font-black text-slate-950 tracking-tight text-center uppercase">
                  Worker Welfare Portal
                </h1>
                <p className="text-xs font-bold text-slate-600 uppercase tracking-wider text-center">
                  Select Language / भाषा चुनें / மொழியைத் தேர்ந்தெடுக்கவும்
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {Object.keys(translations).map((langKey) => {
                  const item = translations[langKey];
                  return (
                    <button
                      key={langKey}
                      onClick={() => {
                        setLang(langKey);
                        sessionStorage.setItem("worker_lang_session", langKey);
                        setScreen("form");
                      }}
                      className="py-3 px-3 text-left border-industrial shadow-industrial bg-white text-slate-950 font-black text-xs hover:bg-safety-yellow active-press transition-all rounded-none flex items-center justify-between"
                    >
                      <span className="truncate pr-1">{item.langName}</span>
                      <span className="text-slate-500 font-bold">➔</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* SCREEN 2: MAIN COMPLAINT FORM */}
          {screen === "form" && (
            <div className="flex flex-col gap-5 flex-1">

              {/* Language Switch bar */}
              <div className="flex items-center justify-between bg-slate-900 text-white p-2 border-industrial-sm shadow-industrial-sm">
                <span className="text-sm font-extrabold uppercase pl-1">🌐 {t.langName}</span>
                <button
                  type="button"
                  onClick={() => setScreen("lang")}
                  className="bg-safety-yellow text-slate-950 px-2.5 py-1 text-xs font-black uppercase active-press-orange border-industrial-sm rounded-none"
                >
                  Change Language / भाषा बदलें
                </button>
              </div>

              {/* Form Input Validation Warning */}
              {validationError && (
                <div className="bg-red-100 border-industrial text-red-700 p-3 font-bold text-sm text-center leading-snug animate-pulse-border shadow-industrial-sm">
                  {validationError}
                </div>
              )}

              {/* File validation warning */}
              {fileValidationError && (
                <div className="bg-red-100 border-industrial text-red-700 p-3 font-bold text-sm text-center leading-snug animate-pulse-border shadow-industrial-sm">
                  {fileValidationError}
                </div>
              )}

              {/* Media Encouragement Instructions */}
              <div className="bg-yellow-50 border-industrial p-3 text-xs text-slate-900 font-bold leading-relaxed shadow-industrial-sm">
                {t.infoBannerText}
              </div>

              {/* 1. PROJECT DROPDOWN */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-black text-slate-950 uppercase tracking-wide flex items-center gap-1">
                  🏢 {t.selectProject} <span className="text-red-600">*</span>
                  {loadingProjects && <span className="text-xs text-blue-600 animate-pulse ml-2 font-semibold">(Loading...)</span>}
                </label>
                <SearchableSelect
                  options={projectsList}
                  value={selectedProject}
                  onChange={(val) => {
                    setSelectedProject(val);
                    setSelectedLocation("");
                  }}
                  placeholder={`-- ${t.projectSelect} --`}
                  language={lang}
                  id="project-select"
                  getBilingualName={getBilingualName}
                  emptyMessage={t.noProjectsFound}
                  isLoading={loadingProjects}
                />
              </div>

              {/* Business Unit — auto-filled from project, read-only */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-black text-slate-950 uppercase tracking-wide flex items-center gap-1">
                  🏛️ {t.businessUnit || "Business Unit"}
                </label>
                <input
                  type="text"
                  readOnly
                  value={selectedBusinessUnit || (t.selectProjectFirst || "Select a project first")}
                  className="w-full px-4 py-3 bg-slate-100 text-slate-700 border-industrial text-base font-bold cursor-not-allowed"
                  tabIndex={-1}
                />
              </div>

              {/* 2. LOCATION DROPDOWN (Disabled until Project is selected) */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-black text-slate-950 uppercase tracking-wide flex items-center gap-1">
                  📍 {t.selectLocation} <span className="text-red-600">*</span>
                  {loadingLocations && <span className="text-xs text-blue-600 animate-pulse ml-2 font-semibold">(Loading...)</span>}
                </label>
                {selectedProject ? (
                  <SearchableSelect
                    options={locationsList}
                    value={selectedLocation}
                    onChange={setSelectedLocation}
                    placeholder={`-- ${t.locationSelect} --`}
                    language={lang}
                    id="location-select"
                    getBilingualName={getBilingualName}
                    emptyMessage={t.noLocationsFound}
                    isLoading={loadingLocations}
                  />
                ) : (
                  <div className="w-full px-4 py-3 bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-slate-700 rounded-lg text-base cursor-not-allowed font-bold">
                    {`-- ${t.locationDisabled} --`}
                  </div>
                )}
              </div>

              {/* 3. CATEGORY SELECTOR CARDS */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-black text-slate-950 uppercase tracking-wide flex items-center gap-1">
                  🏷️ {t.categoryTitle} <span className="text-red-600">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3.5">
                  {Object.entries(t.categories)
                    .filter(([key]) => ["water", "electricity", "toilet", "accommodation", "food", "safety", "other"].includes(key))
                    .map(([key, label]) => {
                      const isSelected = selectedCategory === key;
                      return (
                        <button
                          type="button"
                          key={key}
                          onClick={() => setSelectedCategory(key)}
                          className={`p-4 border-industrial flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-150 rounded-none relative select-none ${isSelected
                            ? "bg-safety-yellow shadow-industrial-sm translate-x-0.5 translate-y-0.5"
                            : "bg-white shadow-industrial hover:bg-slate-100"
                            }`}
                        >
                          <div className="text-3xl mb-2">{t.categoryIcons?.[key] || "📦"}</div>
                          <div className="text-sm font-black text-slate-950 leading-tight">
                            {label}
                          </div>
                          {isSelected && (
                            <div className="absolute top-1 right-1 bg-slate-950 text-safety-yellow w-5 h-5 flex items-center justify-center text-[10px] font-black border-2 border-slate-950">
                              ✓
                            </div>
                          )}
                        </button>
                      );
                    })}
                </div>
              </div>

              {/* Details text area removed for Phase 5.6 */}

              {/* Anchor for scrolling back to uploads */}
              <div id="photo-section-anchor" className="h-1"></div>

              {/* 4. PHOTO SELECTION SECTION */}
              <div className="flex flex-col gap-2 border-2 border-dashed border-slate-400 p-4 bg-slate-100">
                <span className="text-sm font-extrabold text-slate-950 uppercase">
                  {t.photoTitle}
                </span>

                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoSelect}
                  className="hidden"
                  ref={fileInputRef}
                  id="photo-file-selector"
                />

                {!photoUrl ? (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current && fileInputRef.current.click()}
                    className="w-full py-3.5 bg-slate-900 text-white font-black text-sm uppercase tracking-wide border-industrial-sm shadow-industrial active-press flex items-center justify-center gap-2 rounded-none"
                  >
                    {t.photoButton}
                  </button>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <div className="relative border-industrial shadow-industrial-sm w-36 h-36 bg-white overflow-hidden flex items-center justify-center">
                      <img
                        src={photoUrl}
                        alt="Preview"
                        className="object-cover w-full h-full"
                      />
                      <button
                        type="button"
                        onClick={removePhoto}
                        className="absolute top-0 right-0 bg-red-600 text-white font-bold p-1 w-7 h-7 flex items-center justify-center border-l-2 border-b-2 border-slate-950 hover:bg-red-700"
                      >
                        ✕
                      </button>
                    </div>
                    <span className="text-xs font-bold text-green-700 flex items-center gap-1">
                      {t.photoSuccess} ({photoFile?.name})
                    </span>
                  </div>
                )}
              </div>

              {/* 5. VOICE COMPLAINT RECORDER MODULE */}
              <div className="border-industrial p-4 bg-slate-100 flex flex-col gap-3 shadow-industrial-sm">
                <span className="text-sm font-extrabold text-slate-950 uppercase flex items-center gap-1.5">
                  🎙️ {t.voiceTitle}
                </span>

                <div className="flex flex-col items-center bg-white p-3 border-2 border-slate-950 gap-3">
                  <div className="flex items-center justify-between w-full border-b border-slate-300 pb-2">
                    <span className={`text-xs font-black uppercase px-2 py-0.5 border-2 border-slate-950 ${recordingState === "preparing" ? "bg-amber-400 text-slate-950 animate-pulse" :
                      recordingState === "recording" ? "bg-red-500 text-white animate-pulse" :
                        recordingState === "saved" ? "bg-green-500 text-white" :
                          recordingState === "playing" ? "bg-blue-500 text-white" : "bg-slate-300 text-slate-800"
                      }`}>
                      {recordingState === "preparing" ? (
                        <span className="flex items-center gap-1.5">
                          <svg className="animate-spin h-3 w-3 text-slate-950" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          {lang === "hi" ? "🎤 माइक्रोफ़ोन तैयार किया जा रहा है... कृपया अभी न बोलें..." : "🎤 Preparing microphone... Please wait before speaking..."}
                        </span>
                      ) : (
                        recordingState === "recording" ? (lang === "hi" ? "🎤 अब बोलें" : "🎤 Speak Now") :
                          recordingState === "saved" ? t.savedStatus :
                            recordingState === "playing" ? t.playingStatus : t.idleStatus
                      )}
                    </span>
                    <span
                      ref={timerDisplayRef}
                      className="font-mono font-bold text-lg text-slate-950"
                      style={{ display: recordingState === "preparing" ? "none" : "inline-block" }}
                    >
                      {formatTime(recordingDuration)}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2 justify-center w-full">
                    {recordingState === "idle" && (
                      <button
                        type="button"
                        onClick={startRecording}
                        className="py-3 px-6 bg-red-500 hover:bg-red-600 text-white font-extrabold text-sm uppercase border-industrial-sm shadow-industrial-sm active-press flex items-center gap-1.5 rounded-none"
                      >
                        🔴 {t.recordStart}
                      </button>
                    )}

                    {(recordingState === "recording" || recordingState === "preparing") && (
                      <button
                        type="button"
                        onClick={stopRecording}
                        disabled={recordingState === "preparing"}
                        className={`py-3 px-6 text-white font-extrabold text-sm uppercase border-industrial-sm shadow-industrial-sm flex items-center gap-1.5 rounded-none ${recordingState === "preparing"
                          ? "bg-slate-400 text-slate-700 cursor-not-allowed shadow-none"
                          : "bg-slate-950 active-press animate-pulse cursor-pointer"
                          }`}
                      >
                        ⏹ {t.recordStop}
                      </button>
                    )}

                    {recordingState === "saved" && (
                      <>
                        <button
                          type="button"
                          onClick={playAudio}
                          className="py-3 px-4 bg-green-500 hover:bg-green-600 text-slate-950 font-extrabold text-sm uppercase border-industrial-sm shadow-industrial-sm active-press flex items-center gap-1 rounded-none"
                        >
                          {playbackEnded ? t.recordReplay : t.recordPlay}
                        </button>
                        <button
                          type="button"
                          onClick={deleteRecording}
                          className="py-3 px-4 bg-red-500 hover:bg-red-600 text-white font-extrabold text-sm uppercase border-industrial-sm shadow-industrial-sm active-press flex items-center gap-1 rounded-none"
                        >
                          {t.recordDelete}
                        </button>
                        <button
                          type="button"
                          onClick={startRecording}
                          className="py-3 px-4 bg-safety-yellow hover:bg-yellow-500 text-slate-950 font-extrabold text-sm uppercase border-industrial-sm shadow-industrial-sm active-press flex items-center gap-1 rounded-none"
                        >
                          {t.recordAgain}
                        </button>
                      </>
                    )}

                    {recordingState === "playing" && (
                      <button
                        type="button"
                        onClick={stopAudioPlayback}
                        className="py-3 px-6 bg-blue-500 text-slate-950 font-extrabold text-sm uppercase border-industrial-sm shadow-industrial-sm active-press flex items-center gap-1.5 rounded-none"
                      >
                        {t.stopPlayback}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* 6. TRANSLATION PREVIEW AREA */}
              {(recordingState === "saved" || audioUrl || previewLoading || previewTranscript || previewTranslation || previewState !== "idle") && (
                <div className="border-industrial p-5 bg-slate-100 flex flex-col gap-4 shadow-industrial-sm animate-fade-in text-slate-950">
                  <div className="flex items-center justify-between border-b-2 border-slate-950 pb-2">
                    <span className="text-xs font-black uppercase flex items-center gap-1.5 text-slate-950">
                      🤖 {lang === "hi" ? "भाषण पूर्वावलोकन" :
                        lang === "ta" ? "பேச்சு முன்னோட்டம்" :
                          lang === "te" ? "స్పీచ్ ప్రివ్యూ" : "Speech Preview"}
                    </span>
                    <span className={`text-[10px] font-black uppercase border border-slate-950 px-2 py-0.5 ${previewState === "error" ? "bg-red-500 text-white" :
                      previewState === "ready" ? "bg-green-500 text-white" :
                        "bg-amber-400 animate-pulse text-slate-950"
                      }`}>
                      {previewState === "recording_complete" && (lang === "hi" ? "रिकॉर्डिंग पूर्ण" : "Recording Complete")}
                      {previewState === "uploading" && (lang === "hi" ? "ऑडियो अपलोड हो रहा है" : "Uploading Audio")}
                      {previewState === "transcribing" && (lang === "hi" ? "प्रतिलेखन हो रहा है" : "Transcribing")}
                      {previewState === "translating" && (lang === "hi" ? "अनुवाद हो रहा है" : "Translating")}
                      {previewState === "finalizing" && (lang === "hi" ? "अंतिम रूप दिया जा रहा है" : "Finalizing")}
                      {previewState === "ready" && (lang === "hi" ? "तैयार" : "Ready")}
                      {previewState === "error" && (lang === "hi" ? "त्रुटि" : "Error")}
                    </span>
                  </div>
                  {previewLoading ? (
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center justify-center gap-2 py-2">
                        <div className="w-4.5 h-4.5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-[10px] font-black text-slate-900 uppercase tracking-wider animate-pulse">
                          {previewState === "uploading" && (t.uploadingAudio || "Uploading Audio...")}
                          {previewState === "transcribing" && (t.transcribing || "Transcribing Audio...")}
                          {previewState === "translating" && (t.translating || "Translating to English...")}
                          {previewState === "finalizing" && (t.finalizingResults || "Finalizing results...")}
                        </span>
                      </div>
                      <SpeechPreviewSkeleton />
                    </div>
                  ) : previewState === "error" ? (
                    <div className="flex flex-col gap-4">
                      <div className="bg-red-50 border-2 border-red-500 p-4 text-red-700 text-xs font-bold leading-normal text-center shadow-sm">
                        ⚠️ {previewError || "We could not clearly understand the recording."}
                      </div>

                      <div className="flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={() => generateSpeechPreview(audioBlob)}
                          className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs uppercase tracking-wide border-2 border-slate-950 shadow-sm active-press flex items-center justify-center gap-1.5 rounded-none"
                        >
                          {t.tryAgain}
                        </button>
                        <button
                          type="button"
                          onClick={deleteRecording}
                          className="w-full py-2.5 bg-red-500 hover:bg-red-600 text-white font-extrabold text-xs uppercase tracking-wide border-2 border-red-700 shadow-sm active-press flex items-center justify-center gap-1.5 rounded-none"
                        >
                          🎤 Record Again
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsManualFallback(true)}
                          className="w-full py-2.5 bg-safety-yellow hover:bg-yellow-500 text-slate-950 font-extrabold text-xs uppercase tracking-wide border-2 border-slate-950 shadow-sm active-press flex items-center justify-center gap-1.5 rounded-none"
                        >
                          📝 Describe Issue Manually
                        </button>
                      </div>

                      {isManualFallback && (
                        <div className="flex flex-col gap-1.5 border-t-2 border-slate-350 pt-3 animate-fade-in text-slate-950">
                          <label className="text-xs font-black uppercase text-slate-700">
                            {t.describeManually}
                          </label>
                          <textarea
                            value={manualComplaintText}
                            onChange={(e) => setManualComplaintText(e.target.value)}
                            placeholder={t.describeManually}
                            rows={4}
                            className="w-full p-3 border-2 border-slate-950 bg-white text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4">
                      {/* Verification original text */}
                      {previewTranscript && (
                        <div className="bg-white border-2 border-slate-950 p-4 shadow-industrial-sm">
                          <span className="text-xs font-black text-slate-500 uppercase block mb-1.5">
                            ✓ {lang === "hi" ? "यह वह है जो आपने कहा" : "This is what you said"}
                          </span>
                          <p className="text-base font-extrabold text-slate-900 italic leading-snug">
                            "{previewTranscript}"
                          </p>
                        </div>
                      )}

                      {/* Verification translation */}
                      {previewTranslation && (
                        <div className="bg-slate-900 border-2 border-slate-950 p-4 shadow-industrial-sm text-white">
                          <span className="text-xs font-black text-yellow-400 uppercase block mb-1.5">
                            ✓ {lang === "hi" ? "शिकायत इस तरह सबमिट की जाएगी" : "This is how the complaint will be submitted"}
                          </span>
                          <p className="text-base font-extrabold italic text-yellow-50 leading-snug">
                            "{previewTranslation}"
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Space block */}
              <div className="h-16"></div>

              {/* FLOATING ACTION SUBMIT BUTTON */}
              <div className="fixed bottom-0 left-0 right-0 max-w-[600px] mx-auto bg-slate-50 border-t-4 border-slate-950 p-3 z-30 flex justify-center">
                <button
                  type="button"
                  onClick={handleFormSubmit}
                  disabled={(uploadingState !== "idle" && uploadingState !== "failed") || recordingState === "preparing"}
                  className={`w-full py-4 font-black text-lg uppercase tracking-wider border-industrial shadow-industrial flex items-center justify-center gap-2 rounded-none transition-all ${(uploadingState !== "idle" && uploadingState !== "failed") || recordingState === "preparing"
                    ? "bg-slate-400 text-slate-700 cursor-not-allowed shadow-none"
                    : "bg-safety-orange text-white hover:bg-orange-600 active-press-orange cursor-pointer"
                    }`}
                >
                  ⚡ {t.submitBtn}
                </button>
              </div>

              {/* WARNING DIALOGS / REMINDER MODALS OVERLAYS */}
              {mediaReminderType !== null && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                  <div className="bg-white border-industrial shadow-industrial-lg w-full max-w-[380px] p-5 flex flex-col gap-4 animate-fade-in">

                    <h3 className="text-lg font-black text-slate-950 uppercase border-b-2 border-slate-950 pb-2">
                      {mediaReminderType === "both_missing" ? t.bothMissingTitle : t.oneMissingTitle}
                    </h3>

                    <p className="text-sm font-bold text-slate-700 leading-relaxed">
                      {mediaReminderType === "both_missing"
                        ? t.bothMissingText
                        : t.oneMissingText.replace(
                          "{item}",
                          photoFile === null ? t.missingPhoto : t.missingAudio
                        )}
                    </p>

                    <div className="flex flex-col gap-2.5 mt-2">
                      <button
                        type="button"
                        onClick={handleAddMedia}
                        className="py-3 bg-safety-yellow text-slate-950 font-black text-sm uppercase border-industrial-sm shadow-industrial-sm active-press rounded-none"
                      >
                        {mediaReminderType === "both_missing"
                          ? t.addMedia
                          : t.addMissingMedia.replace(
                            "{item}",
                            photoFile === null ? t.missingPhoto : t.missingAudio
                          )}
                      </button>

                      <button
                        type="button"
                        onClick={handleProceedAnyway}
                        className="py-3 bg-slate-900 text-white font-bold text-sm uppercase border-industrial-sm shadow-industrial-sm active-press rounded-none"
                      >
                        {t.submitAnyway}
                      </button>
                    </div>

                  </div>
                </div>
              )}

              {/* UPLOADING PROGRESS STATUS OVERLAY MODAL */}
              {uploadingState !== "idle" && uploadingState !== "success" && (
                <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4">
                  <div className="bg-white border-industrial shadow-industrial-lg w-full max-w-[380px] p-5 flex flex-col gap-4 animate-fade-in text-slate-950">

                    <h3 className="text-lg font-black uppercase border-b-2 border-slate-950 pb-2">
                      {uploadingState === "failed" ? t.uploadFailedTitle : t.processingSubmission}
                    </h3>

                    <div className="flex flex-col gap-3">
                      {/* Photo Upload Row */}
                      {photoFile && (
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center justify-between text-xs font-black uppercase">
                            <span>📷 {t.uploadPhotoState}</span>
                            <span>{photoUploadProgress}%</span>
                          </div>
                          <div className="w-full bg-slate-200 h-4 border border-slate-950 relative overflow-hidden">
                            <div
                              className="bg-safety-orange h-full transition-all duration-150"
                              style={{ width: `${photoUploadProgress}%` }}
                            ></div>
                          </div>
                          {photoUploadStatus === "uploaded" && (
                            <span className="text-[10px] font-black text-green-700">✓ UPLOADED</span>
                          )}
                          {photoUploadStatus === "failed" && (
                            <span className="text-[10px] font-black text-red-700">✗ UPLOAD FAILED</span>
                          )}
                        </div>
                      )}

                      {/* Audio Upload Row */}
                      {audioBlob && (
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center justify-between text-xs font-black uppercase">
                            <span>🎙️ {t.uploadAudioState}</span>
                            <span>{audioUploadProgress}%</span>
                          </div>
                          <div className="w-full bg-slate-200 h-4 border border-slate-950 relative overflow-hidden">
                            <div
                              className="bg-safety-yellow h-full transition-all duration-150"
                              style={{ width: `${audioUploadProgress}%` }}
                            ></div>
                          </div>
                          {audioUploadStatus === "uploaded" && (
                            <span className="text-[10px] font-black text-green-700">✓ UPLOADED</span>
                          )}
                          {audioUploadStatus === "failed" && (
                            <span className="text-[10px] font-black text-red-700">✗ UPLOAD FAILED</span>
                          )}
                        </div>
                      )}

                      {/* API Registration state */}
                      {uploadingState === "submitting_api" && (
                        <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-300 p-2 mt-1">
                          <span className="animate-spin text-sm">⏳</span>
                          <span className="text-xs font-black uppercase">{t.registeringState}</span>
                        </div>
                      )}

                      {/* Network upload failed message */}
                      {uploadingState === "failed" && (
                        <p className="text-xs font-bold text-red-700 leading-normal mt-1 bg-red-50 border border-red-200 p-2">
                          {t.uploadFailedText}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 mt-2">
                      {uploadingState === "failed" ? (
                        <>
                          <button
                            type="button"
                            onClick={runSubmissionPipeline}
                            className="py-3 bg-safety-yellow text-slate-950 font-black text-sm uppercase border-industrial-sm shadow-industrial-sm active-press rounded-none"
                          >
                            {t.retryBtn}
                          </button>
                          <button
                            type="button"
                            onClick={() => setUploadingState("idle")}
                            className="py-2.5 bg-slate-200 text-slate-800 font-bold text-xs uppercase border border-slate-400 active-press rounded-none"
                          >
                            {t.cancelSubmission}
                          </button>
                        </>
                      ) : (
                        <span className="text-[10px] font-black text-center text-slate-500 uppercase tracking-widest animate-pulse">
                          Do not close this screen
                        </span>
                      )}
                    </div>

                  </div>
                </div>
              )}

            </div>
          )}

          {/* SCREEN 3: SUCCESS CARD */}
          {screen === "success" && successDetails && (
            <div className="flex-1 flex flex-col gap-6 py-6 animate-fade-in text-slate-950">

              <div className="flex flex-col items-center text-center gap-2">
                <div className="w-20 h-20 bg-green-500 text-slate-950 flex items-center justify-center text-5xl font-black rounded-full border-4 border-slate-950 shadow-industrial animate-bounce mt-4">
                  ✓
                </div>
                <h2 className="text-2xl font-black text-slate-950 leading-tight uppercase mt-4">
                  {t.successTitle}
                </h2>
                <p className="text-sm font-bold text-slate-700 max-w-sm mt-1">
                  {t.successText}
                </p>
              </div>

              {/* Logged details (Note: NO reference number printed here as requested) */}
              <div className="bg-white border-industrial shadow-industrial-lg p-5 flex flex-col gap-4">

                <div className="flex flex-col gap-3">
                  <span className="text-xs font-black uppercase text-slate-900 border-b border-slate-200 pb-1">
                    📋 {t.detailsHeader}
                  </span>

                  <div className="grid grid-cols-3 text-sm border-b border-slate-100 pb-2">
                    <span className="font-extrabold text-slate-500 uppercase">{t.projectLabel}:</span>
                    <span className="col-span-2 font-black text-slate-950 break-words">{successDetails.project}</span>
                  </div>

                  <div className="grid grid-cols-3 text-sm border-b border-slate-100 pb-2">
                    <span className="font-extrabold text-slate-500 uppercase">{t.locationLabel}:</span>
                    <span className="col-span-2 font-black text-slate-950">{successDetails.location}</span>
                  </div>

                  <div className="grid grid-cols-3 text-sm border-b border-slate-100 pb-2">
                    <span className="font-extrabold text-slate-500 uppercase">{t.categoryLabel}:</span>
                    <span className="col-span-2 font-black text-slate-950">
                      {t.categories[successDetails.category] || successDetails.category}
                    </span>
                  </div>


                  <div className="grid grid-cols-3 text-sm">
                    <span className="font-extrabold text-slate-500 uppercase">Registered:</span>
                    <span className="col-span-2 font-bold text-slate-800">
                      {new Date(successDetails.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(successDetails.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                </div>

              </div>

              {/* Start Over Button */}
              <button
                onClick={handleResetForm}
                className="w-full py-4 mt-4 bg-safety-yellow text-slate-950 font-black text-lg uppercase tracking-wider border-industrial shadow-industrial active-press flex items-center justify-center gap-2 rounded-none cursor-pointer"
              >
                {t.newComplaintBtn}
              </button>

            </div>
          )}

        </main>

        {/* Warning Stripes bottom accent */}
        <div className="h-4 bg-hazard-stripes border-t-2 border-slate-950 w-full mt-auto"></div>

      </div>
    </div>
  );
}
