import { useRef, useState, useEffect, useCallback } from "react";
import { Camera, X, Scan, Upload } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onScan: (base64: string) => void;
}

export default function WebcamScanner({ isOpen, onClose, onScan }: Props) {
  const videoRef   = useRef<HTMLVideoElement>(null);
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const streamRef  = useRef<MediaStream | null>(null);
  const fileRef    = useRef<HTMLInputElement>(null);

  const [camReady,   setCamReady]   = useState(false);
  const [scanning,   setScanning]   = useState(false);
  const [camError,   setCamError]   = useState<string | null>(null);
  const [scanLine,   setScanLine]   = useState(false); // amber sweep

  // Start camera when modal opens
  useEffect(() => {
    if (!isOpen) return;
    setCamError(null);
    setCamReady(false);
    setScanning(false);

    navigator.mediaDevices
      .getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 } } })
      .then((stream) => {
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().then(() => setCamReady(true));
        }
      })
      .catch(() => setCamError("Camera access denied — use the file upload instead."));

    return () => stopCamera();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const captureFrame = useCallback((): string | null => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return null;

    canvas.width  = video.videoWidth  || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.88);
    return dataUrl.split(",")[1]; // strip data-URL prefix
  }, []);

  const handleScan = () => {
    if (!camReady || scanning) return;
    setScanning(true);
    setScanLine(true);

    // 1. Brief amber sweep visual (400ms)
    setTimeout(() => {
      const base64 = captureFrame();
      setScanLine(false);
      setScanning(false);
      stopCamera();
      onClose();
      if (base64) onScan(base64);
    }, 420);
  };

  // File fallback
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      const base64  = dataUrl.split(",")[1];
      stopCamera();
      onClose();
      if (base64) onScan(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        style={{
          position: "fixed", inset: 0, zIndex: 9000,
          background: "rgba(14, 14, 16, 0.85)",
          display: "flex", alignItems: "center", justifyContent: "center",
          backdropFilter: "blur(4px)",
        }}
        onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
      >
        <motion.div
          initial={{ scale: 0.94, opacity: 0, y: 12 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.94, opacity: 0, y: 12 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          style={{
            background: "#1A1A1E",
            border: "1px solid rgba(255,255,255,0.08)",
            borderTop: "2px solid #B45309",
            borderRadius: 12,
            width: "min(680px, 90vw)",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex items-center gap-2">
              <Camera size={14} style={{ color: "#B45309" }} strokeWidth={1.5} />
              <span className="font-mono uppercase tracking-[0.18em]"
                style={{ fontSize: 10, color: "#B45309" }}>
                Label Scanner
              </span>
            </div>
            <div className="flex items-center gap-3">
              {/* File fallback */}
              <label
                className="flex items-center gap-1.5 cursor-pointer"
                style={{ opacity: 0.55 }}
                title="Upload image instead"
              >
                <Upload size={12} style={{ color: "#88888E" }} strokeWidth={1.5} />
                <span className="font-mono" style={{ fontSize: 10, color: "#88888E" }}>Upload</span>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              </label>
              <button onClick={handleClose} style={{ color: "#88888E", lineHeight: 0 }}>
                <X size={16} strokeWidth={1.5} />
              </button>
            </div>
          </div>

          {/* Video area */}
          <div style={{ position: "relative", background: "#0E0E10", minHeight: 280 }}>
            <video
              ref={videoRef}
              muted
              playsInline
              style={{
                width: "100%",
                display: "block",
                maxHeight: 380,
                objectFit: "cover",
                opacity: camReady ? 1 : 0,
                transition: "opacity 0.3s ease",
              }}
            />

            {/* Loading state */}
            {!camReady && !camError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full pulse-dot" style={{ background: "#B45309" }} />
                <span className="font-mono" style={{ fontSize: 11, color: "#88888E" }}>
                  Starting camera…
                </span>
              </div>
            )}

            {/* Error state */}
            {camError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-8 text-center">
                <span style={{ fontSize: 28 }}>📷</span>
                <span className="font-sans" style={{ fontSize: 13, color: "#88888E", lineHeight: 1.6 }}>
                  {camError}
                </span>
                <label
                  className="flex items-center gap-2 px-4 py-2 rounded cursor-pointer font-sans font-medium"
                  style={{ fontSize: 13, background: "#B45309", color: "#FAFAF7" }}
                >
                  <Upload size={13} strokeWidth={1.5} />
                  Choose Image File
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                </label>
              </div>
            )}

            {/* Amber scan-line sweep */}
            {scanLine && (
              <motion.div
                initial={{ top: "0%" }}
                animate={{ top: "100%" }}
                transition={{ duration: 0.4, ease: "linear" }}
                style={{
                  position: "absolute", left: 0, right: 0,
                  height: 2,
                  background: "linear-gradient(90deg, transparent, #F59E0B, transparent)",
                  boxShadow: "0 0 12px 2px rgba(245,158,11,0.5)",
                  pointerEvents: "none",
                }}
              />
            )}

            {/* Corner guides */}
            {camReady && !scanning && (
              <>
                {[
                  { top: 12, left: 12,  borderTop: "2px solid #F59E0B", borderLeft:   "2px solid #F59E0B" },
                  { top: 12, right: 12, borderTop: "2px solid #F59E0B", borderRight:  "2px solid #F59E0B" },
                  { bottom: 12, left: 12,  borderBottom: "2px solid #F59E0B", borderLeft:  "2px solid #F59E0B" },
                  { bottom: 12, right: 12, borderBottom: "2px solid #F59E0B", borderRight: "2px solid #F59E0B" },
                ].map((s, i) => (
                  <div key={i} style={{ position: "absolute", width: 18, height: 18, ...s }} />
                ))}
              </>
            )}
          </div>

          {/* Hidden canvas */}
          <canvas ref={canvasRef} style={{ display: "none" }} />

          {/* Footer */}
          <div className="flex items-center justify-between px-5 py-4"
            style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <span className="font-sans" style={{ fontSize: 12, color: "#76767C", lineHeight: 1.5 }}>
              Hold the ingredient list steady in front of the camera
            </span>

            <div className="flex items-center gap-3">
              <button
                onClick={handleClose}
                className="px-4 py-1.5 rounded font-sans"
                style={{ fontSize: 13, color: "#88888E", border: "1px solid rgba(255,255,255,0.08)", background: "transparent" }}
              >
                Cancel
              </button>
              <button
                onClick={handleScan}
                disabled={!camReady || scanning || !!camError}
                className="flex items-center gap-2 px-4 py-1.5 rounded font-sans font-medium"
                style={{
                  fontSize: 13,
                  background: (!camReady || scanning || camError) ? "rgba(180,83,9,0.3)" : "#B45309",
                  color: "#FAFAF7",
                  cursor: (!camReady || scanning || camError) ? "not-allowed" : "pointer",
                  transition: "background 0.15s",
                }}
              >
                <Scan size={13} strokeWidth={1.5} />
                {scanning ? "Scanning…" : "Scan Label"}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
