import { useEffect, useState, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import api from "../api/client.js";
import { useNavigate } from "react-router-dom";

export default function MarkAttendance() {
  const [status, setStatus] = useState("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [studentName, setStudentName] = useState("");

  const scannerRef = useRef(null);
  const isProcessingRef = useRef(false);
  const navigate = useNavigate();

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        await scannerRef.current.clear();
      } catch (err) {
        console.warn("Scanner cleanup:", err);
      }
    }
  };

  useEffect(() => {
    const html5QrCode = new Html5Qrcode("reader");
    scannerRef.current = html5QrCode;

    const startCamera = async () => {
      try {
        const cameraMode = window.innerWidth > 768 ? "user" : "environment";
        await html5QrCode.start(
          { facingMode: cameraMode },
          {
            fps: 20,
            qrbox: { width: 220, height: 220 },
          },
          onScanSuccess
        );
        setStatus("scanning");
      } catch (err) {
        setErrorMessage("Camera access failed.");
        setStatus("error");
      }
    };

    async function onScanSuccess(decodedText) {
      if (isProcessingRef.current) return;
      isProcessingRef.current = true;

      try {
        const qrData = JSON.parse(decodedText);
        setStatus("submitting");
        await stopScanner();

        const { data } = await api.post("/attendance/self", {
          classId: qrData.classId,
          sessionToken: qrData.token,
        });

        setStudentName(data?.studentName || "Student");
        setStatus("success");
        setTimeout(() => navigate("/app", { replace: true }), 1500);
      } catch (err) {
        setErrorMessage(err.response?.data?.message || "Invalid Code");
        setStatus("error");
        setTimeout(() => {
          setErrorMessage("");
          setStatus("scanning");
          isProcessingRef.current = false;
          startCamera();
        }, 3000);
      }
    }

    startCamera();
    return () => stopScanner();
  }, [navigate]);

  return (
    /** * HIDE SCROLL: 
     * 'h-full overflow-hidden' ensures the container doesn't grow.
     * 'touch-none' prevents mobile "pull-to-refresh" or accidental scrolling.
     */
    <div className="w-full h-full min-h-[80vh] max-h-screen flex flex-col items-center justify-center p-6 bg-transparent overflow-hidden touch-none">
      
      <div className="w-full text-center mb-6">
        <h1 className="text-4xl font-black italic tracking-tighter text-slate-900 dark:text-white leading-none">
          Scanner
        </h1>
        <p className="text-[10px] font-black uppercase text-brand-600 tracking-[0.3em] mt-2">
          Attendance System
        </p>
      </div>

      {/* Main Scanner Container: clipped overflow prevents library video from leaking out */}
      <div className="relative w-full aspect-square max-w-[320px] bg-black rounded-[3rem] shadow-2xl border-[6px] border-white dark:border-slate-800 overflow-hidden">
        
        {/* FORCED VIDEO STYLE: 
            The library injects a <video> element. We force it to be object-cover 
            and 100% height/width so it never creates a scrollbar.
        */}
        <div 
            id="reader" 
            className="w-full h-full [&_video]:object-cover [&_video]:w-full [&_video]:h-full [&_video]:block" 
        />

        {/* --- SQUARE BOX OVERLAY --- */}
        {status === "scanning" && (
          <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center">
             <div className="relative w-[210px] h-[210px] rounded-[2.5rem] border-2 border-brand-500 shadow-[0_0_0_1000px_rgba(15,23,42,0.7)]">
                {/* Animated Scan Line */}
                <div className="absolute top-0 left-0 w-full h-[2px] bg-brand-400 shadow-[0_0_20px_#6366f1] animate-scan-move" />
                
                {/* Corner Brackets */}
                <div className="absolute -top-1 -left-1 w-10 h-10 border-t-[6px] border-l-[6px] border-white rounded-tl-2xl" />
                <div className="absolute -top-1 -right-1 w-10 h-10 border-t-[6px] border-r-[6px] border-white rounded-tr-2xl" />
                <div className="absolute -bottom-1 -left-1 w-10 h-10 border-b-[6px] border-l-[6px] border-white rounded-bl-2xl" />
                <div className="absolute -bottom-1 -right-1 w-10 h-10 border-b-[6px] border-r-[6px] border-white rounded-br-2xl" />
              </div>
          </div>
        )}

        {/* FEEDBACK OVERLAYS */}
        {status === "success" && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-emerald-500 text-white animate-in zoom-in duration-300">
            <span className="text-7xl mb-2">✅</span>
            <p className="font-black text-xl tracking-tight uppercase">{studentName}</p>
            <p className="text-[10px] font-bold opacity-80 tracking-widest">Marked Present</p>
          </div>
        )}

        {status === "submitting" && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-900/90 backdrop-blur-sm text-white">
            <div className="flex flex-col items-center gap-3">
                <div className="animate-spin border-4 border-brand-500 border-t-transparent rounded-full w-10 h-10" />
                <p className="text-[10px] font-black uppercase tracking-widest">Verifying...</p>
            </div>
          </div>
        )}
      </div>

      {/* ERROR DISPLAY (H-10 keeps space reserved so layout doesn't jump) */}
      <div className="h-10 mt-6 flex items-center">
        {errorMessage && (
          <div className="px-5 py-2 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 rounded-full text-[10px] font-black uppercase tracking-wider border border-red-100 dark:border-red-900/50 animate-bounce">
            ⚠️ {errorMessage}
          </div>
        )}
      </div>

      <button
        onClick={() => navigate(-1)}
        className="mt-2 px-8 py-3 text-slate-400 dark:text-slate-500 text-[11px] font-black uppercase tracking-[0.2em] hover:text-brand-600 transition-colors"
      >
        ← Cancel Scan
      </button>
    </div>
  );
}