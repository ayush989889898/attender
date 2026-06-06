import { useEffect, useState, useRef } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import api from "../api/client.js";
import { useNavigate } from "react-router-dom";

export default function MarkAttendance() {
  const [status, setStatus] = useState("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [studentName, setStudentName] = useState("");
  const [hasStarted, setHasStarted] = useState(false);
  const [debugHint, setDebugHint] = useState("");
  const [scanPayload, setScanPayload] = useState(null);
  const [distanceMeters, setDistanceMeters] = useState(null);
  const [distanceError, setDistanceError] = useState("");
  const [studentCoords, setStudentCoords] = useState(null);
  const [studentAccuracy, setStudentAccuracy] = useState(null);
  const [effectiveDistanceMeters, setEffectiveDistanceMeters] = useState(null);
  const [markedStatus, setMarkedStatus] = useState("");
  const [geofenceMeters, setGeofenceMeters] = useState(3);

  const scannerRef = useRef(null);
  const isProcessingRef = useRef(false);
  const isStartingRef = useRef(false);
  const navigate = useNavigate();

  const haversineDistanceMeters = (lat1, lon1, lat2, lon2) => {
    const toRad = (value) => (value * Math.PI) / 180;
    const earthRadius = 6371000; // meters
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadius * c;
  };

  const getReadableError = (err) => {
    if (err?.response?.data?.message) return err.response.data.message;
    if (err?.message) return err.message;
    return "Something went wrong";
  };

  const isIosDevice = () => {
    const userAgent = navigator.userAgent || "";
    return /iP(hone|od|ad)/.test(userAgent)
      || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  };

  const getPreferredCamera = async () => {
    const cameras = await Html5Qrcode.getCameras();
    if (!cameras?.length) return { facingMode: { ideal: "environment" } };

    const rearCamera = cameras.find((camera) =>
      /back|rear|environment|wide/i.test(camera.label)
    );

    return rearCamera?.id || cameras[0].id;
  };

  // 1. Helper to safely stop the scanner
  const stopScanner = async ({ clear = false } = {}) => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
        if (clear) {
          await scannerRef.current.clear();
        }
      } catch (err) {
        console.warn("Cleanup error:", err);
      }
    }
  };

  // 2. Attendance Submission Logic
  const submitDecodedText = async (decodedText) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    try {
      const qrData = JSON.parse(decodedText);
      const classId = qrData.classId || qrData.c;
      const sessionToken = qrData.token || qrData.t;
      const sessionLat = Number(qrData.sessionLat ?? qrData.la);
      const sessionLng = Number(qrData.sessionLng ?? qrData.lo);
      const sessionAccuracyMeters = Number(qrData.sessionAccuracyMeters ?? qrData.ac ?? 0);

      if (!classId || !sessionToken || Number.isNaN(sessionLat) || Number.isNaN(sessionLng)) {
        throw new Error("Invalid QR Code");
      }

      await stopScanner(); // Stop camera immediately once QR is valid
      setScanPayload({ classId, sessionToken, sessionLat, sessionLng, sessionAccuracyMeters });
      setDistanceError("");
      setDistanceMeters(null);
      setStudentCoords(null);
      setStudentAccuracy(null);
      setEffectiveDistanceMeters(null);
      setGeofenceMeters(3);
      setStatus("idle");

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const currentLat = position.coords.latitude;
          const currentLng = position.coords.longitude;
          const computedDistance = haversineDistanceMeters(
            sessionLat,
            sessionLng,
            currentLat,
            currentLng
          );
          const currentAccuracy = Number(position.coords.accuracy || 0);
          const effectiveDistance = Math.max(
            0,
            computedDistance - (sessionAccuracyMeters + currentAccuracy)
          );
          setStudentCoords({ lat: currentLat, lng: currentLng });
          setStudentAccuracy(currentAccuracy);
          setDistanceMeters(computedDistance);
          setEffectiveDistanceMeters(effectiveDistance);
          setDistanceError("");
          markAttendance({
            classId,
            sessionToken,
            lat: currentLat,
            lng: currentLng,
            accuracy: currentAccuracy,
          });
        },
        (geoErr) => {
          setDistanceError(
            geoErr?.code === 1
              ? "Location permission denied. Enable GPS to continue."
              : "Unable to fetch high-accuracy location."
          );
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    } catch (err) {
      setErrorMessage(getReadableError(err) || "Invalid Code");
      setStatus("error");
      setTimeout(() => {
        setErrorMessage("");
        setStatus("scanning");
        setScanPayload(null);
        setDistanceMeters(null);
        setDistanceError("");
        setStudentCoords(null);
        setStudentAccuracy(null);
        setEffectiveDistanceMeters(null);
        setMarkedStatus("");
        isProcessingRef.current = false;
        startCamera(); // Restart scanning
      }, 3000);
    }
  };

  const markAttendance = async ({ classId, sessionToken, lat, lng, accuracy }) => {
    setStatus("submitting");
    setErrorMessage("");
    try {
      const { data } = await api.post("/attendance/self", {
        classId,
        sessionToken,
        studentLat: lat,
        studentLng: lng,
        studentAccuracyMeters: accuracy,
      });

      setStudentName(data?.studentName || "Student");
      setMarkedStatus(data?.status || "");
      setGeofenceMeters(Number(data?.geofenceMeters) || 3);
      setStatus(data?.status === "absent" ? "absent" : "success");
      if ("vibrate" in navigator) navigator.vibrate([100, 50, 100]);
      setTimeout(() => navigate("/app", { replace: true }), 2000);
    } catch (err) {
      setErrorMessage(getReadableError(err) || "Unable to mark attendance");
      setStatus("error");
      isProcessingRef.current = false;
    }
  };

  // 3. Main Camera Start Logic (Optimized for Mobile)
  const startCamera = async () => {
    if (!scannerRef.current || isStartingRef.current) return;

    isStartingRef.current = true;

    try {
      await stopScanner();
      setDebugHint("");
      setErrorMessage("");
      setStatus("idle");

      const cameraConfig = await getPreferredCamera();

      await scannerRef.current.start(
        cameraConfig,
        {
          fps: 10,
          qrbox: (vw, vh) => {
            const minEdge = Math.min(vw, vh);
            const boxSize = Math.floor(minEdge * 0.7);
            return { width: boxSize, height: boxSize };
          },
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          experimentalFeatures: { useBarCodeDetectorIfSupported: true },
        },
        (decodedText) => submitDecodedText(decodedText),
        () => { /* Quietly ignore scan failures */ }
      );

      setStatus("scanning");
      setHasStarted(true);
    } catch (err) {
      const isSecure = window.isSecureContext;
      if (!isSecure) {
        setErrorMessage("HTTPS REQUIRED: Open the 'https://' ngrok link.");
      } else if (/permission/i.test(err?.message || "")) {
        setErrorMessage("Camera permission denied. Allow camera access and try again.");
      } else if (err?.name === "AbortError" || /interrupted because the media was removed/i.test(err?.message || "")) {
        setErrorMessage("Camera start was interrupted. Tap Open Camera once and wait.");
      } else {
        setErrorMessage(getReadableError(err) || "Could not open mobile camera.");
      }
      setDebugHint(err?.message || "");
      setStatus("error");
    } finally {
      isStartingRef.current = false;
    }
  };

  useEffect(() => {
    // Initialize the library instance once
    const html5QrCode = new Html5Qrcode("reader");
    scannerRef.current = html5QrCode;

    // AUTO-START only on non-iOS. 
    // iOS Safari requires a click, so we let the "Start" button handle it.
    const isIos = isIosDevice();
    if (!isIos) {
      startCamera();
    }

    return () => {
      // Clean up hardware when leaving the page
      if (scannerRef.current) {
        stopScanner({ clear: true }).catch(() => {});
      }
    };
  }, []);

  return (
    <div className="w-full min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-950 overflow-y-auto">
      <div className="w-full text-center mb-8">
        <h1 className="text-4xl font-black italic tracking-tighter text-slate-900 dark:text-white">SCANNER</h1>
        <p className="text-[10px] font-bold uppercase text-brand-600 tracking-widest">Attender System</p>
      </div>

      {/* Scanner Container */}
      <div className="relative w-full aspect-square max-w-[340px] shrink-0 bg-black rounded-[3rem] shadow-2xl border-[8px] border-white dark:border-slate-800 overflow-hidden">
        <div
          id="reader"
          className="w-full h-full [&_video]:h-full [&_video]:w-full [&_video]:object-cover [&>div]:border-0 [&_img]:hidden"
        />

        {/* Scanning Overlay */}
        {status === "scanning" && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="relative w-48 h-48 rounded-3xl border-2 border-brand-500 shadow-[0_0_0_1000px_rgba(0,0,0,0.6)]">
              <div className="absolute top-0 left-0 w-full h-1 bg-brand-400 shadow-[0_0_15px_#6366f1] animate-pulse" />
            </div>
          </div>
        )}

        {/* Status Overlays */}
        {status === "submitting" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/80 backdrop-blur-md text-white">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white mb-4" />
            <p className="text-xs font-black uppercase tracking-widest">Verifying...</p>
          </div>
        )}

        {status === "success" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-emerald-500 text-white animate-in fade-in zoom-in">
            <span className="text-6xl mb-4">⭐</span>
            <p className="font-black text-2xl">{studentName}</p>
            <p className="text-xs font-bold opacity-80">
              PRESENT MARKED
            </p>
          </div>
        )}
        {status === "absent" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-600 text-white animate-in fade-in zoom-in">
            <span className="text-6xl mb-4">!</span>
            <p className="font-black text-2xl">{studentName}</p>
            <p className="text-xs font-bold opacity-90">
              ABSENT MARKED (OUTSIDE {geofenceMeters}M)
            </p>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="mt-8 w-full flex flex-col items-center gap-3">
        {errorMessage && (
          <div className="px-4 py-2 bg-red-100 text-red-700 rounded-full text-[10px] font-bold uppercase animate-bounce">
            ⚠️ {errorMessage}
          </div>
        )}

        {debugHint && (
          <p className="max-w-xs text-center text-[10px] text-slate-500 break-words">
            {debugHint}
          </p>
        )}

        {scanPayload && (
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-4 text-left space-y-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
              Validation checks
            </p>
            <p className="text-xs font-bold text-slate-700">
              Raw distance:{" "}
              {typeof distanceMeters === "number" ? `${distanceMeters.toFixed(2)} m` : "Checking..."}
            </p>
            <p className="text-xs font-bold text-slate-700">
              Effective distance:{" "}
              {typeof effectiveDistanceMeters === "number" ? `${effectiveDistanceMeters.toFixed(2)} m` : "Checking..."}
            </p>
            {typeof studentAccuracy === "number" && (
              <p className="text-[10px] font-bold text-slate-500">
                GPS accuracy: +/- {studentAccuracy.toFixed(1)} m
              </p>
            )}
            {distanceError && <p className="text-xs font-bold text-red-600">{distanceError}</p>}
            <p className="text-[10px] font-bold text-slate-500 uppercase">
              Attendance is marked automatically after QR scan
            </p>
          </div>
        )}

        {!hasStarted && (
          <button onClick={startCamera} className="w-full max-w-[200px] py-4 bg-brand-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg">
            Open Camera
          </button>
        )}

        <button onClick={() => navigate(-1)} className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-4">
          Cancel & Exit
        </button>
      </div>
    </div>
  );
}