import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  Upload,
  ArrowLeft,
  ScanFace,
  RefreshCw,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Sparkles,
  Database,
  UserCheck,
  AlertTriangle
} from 'lucide-react';
import { faceService } from '../services/face';

export const FaceTestingPage = ({
  currentUser,
  onBack,
  onNavigateToEnrollment
}) => {
  const [cameraActive, setCameraActive] = useState(false);
  const [stream, setStream] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [testImage, setTestImage] = useState(null);
  const [verificationResult, setVerificationResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [enrollmentStatus, setEnrollmentStatus] = useState(null);
  const [statusLoading, setStatusLoading] = useState(true);

  const videoRef = useRef(null);
  const fileInputRef = useRef(null);

  // Check enrollment status on mount
  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    setStatusLoading(true);
    try {
      const status = await faceService.getStatus();
      setEnrollmentStatus(status);
    } catch (err) {
      console.warn('Status check error:', err);
    } finally {
      setStatusLoading(false);
    }
  };

  // Start webcam
  const startCamera = async () => {
    setErrorMsg(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false
      });
      setStream(mediaStream);
      setCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error('Camera error:', err);
      setErrorMsg('Unable to access webcam. Please check your browser permissions.');
    }
  };

  // Stop webcam
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setCameraActive(false);
  };

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  // Capture from webcam and immediately verify
  const captureAndVerify = async () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);

    setTestImage(dataUrl);
    await executeVerification(dataUrl);
  };

  // Upload file for testing
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please upload a valid image file (JPG, PNG, WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result;
      if (dataUrl) {
        setTestImage(dataUrl);
        await executeVerification(dataUrl);
      }
    };
    reader.readAsDataURL(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Core verification call
  const executeVerification = async (imageBase64) => {
    setIsVerifying(true);
    setErrorMsg(null);
    setVerificationResult(null);

    try {
      const result = await faceService.verifyFace(imageBase64);
      setVerificationResult(result);
    } catch (err) {
      setErrorMsg(err.message || 'Face recognition testing failed.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#202124] text-white flex flex-col justify-between select-none">
      {/* Top Navbar */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-[#3c4043]/40 bg-[#202124]/90 backdrop-blur sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-[#282a2d] hover:bg-[#3c4043] border border-[#3c4043] text-gray-300 hover:text-white transition-colors flex items-center gap-2 text-sm"
          >
            <ArrowLeft size={16} />
            <span>Back to Lobby</span>
          </button>
          <div className="h-5 w-px bg-[#3c4043]" />
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center">
              <UserCheck size={18} className="text-emerald-400" />
            </div>
            <div>
              <h1 className="text-base font-semibold leading-tight text-white flex items-center gap-2">
                Face Recognition Testing
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Verification
                </span>
              </h1>
              <p className="text-xs text-gray-400">Validate live camera or uploaded photos with FaceNet 512D</p>
            </div>
          </div>
        </div>

        {/* Right Navigation */}
        <div className="flex items-center gap-3">
          <button
            onClick={onNavigateToEnrollment}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/40 text-xs font-medium text-blue-200 transition-all"
          >
            <ScanFace size={14} />
            <span>Manage Face Enrollment</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl w-full mx-auto px-6 py-8 flex-1 space-y-8">
        {/* Not Enrolled Warning */}
        {!statusLoading && enrollmentStatus && !enrollmentStatus.enrolled && (
          <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/40 text-amber-200 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <AlertTriangle size={20} className="text-amber-400 shrink-0" />
              <div className="text-xs sm:text-sm">
                <span className="font-semibold">No FaceNet enrollment found for {currentUser?.name}.</span>
                <p className="text-amber-300/80 text-xs mt-0.5">
                  You must enroll up to 5 photos first before running verification tests.
                </p>
              </div>
            </div>
            <button
              onClick={onNavigateToEnrollment}
              className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-black font-semibold text-xs transition-colors shrink-0"
            >
              Enroll Now
            </button>
          </div>
        )}

        {/* Error Notification */}
        {errorMsg && (
          <div className="p-4 rounded-2xl bg-red-950/40 border border-red-500/40 text-red-300 text-sm flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <XCircle size={18} className="text-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button
              onClick={() => setErrorMsg(null)}
              className="text-xs uppercase font-mono opacity-70 hover:opacity-100"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Two Columns: Test Input on Left, Comparison / Match Results on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Live Webcam & Photo Upload (6 cols) */}
          <div className="lg:col-span-6 space-y-6">
            {/* Webcam Live Testing Viewfinder */}
            <div className="p-6 rounded-2xl bg-[#282a2d] border border-[#3c4043] space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Camera size={18} className="text-emerald-400" />
                  <h2 className="text-sm font-semibold text-white">Live Camera Test</h2>
                </div>
                {cameraActive && (
                  <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Live Viewfinder
                  </span>
                )}
              </div>

              {/* Viewfinder Window */}
              <div className="relative aspect-video rounded-xl bg-[#1e1f20] border border-[#3c4043] overflow-hidden flex items-center justify-center">
                {cameraActive ? (
                  <>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover -scale-x-100"
                    />
                    {/* Face Target Scanner Reticle */}
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      <div className="w-44 h-60 border-2 border-emerald-400/60 rounded-3xl relative flex items-center justify-center">
                        <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-emerald-400" />
                        <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-emerald-400" />
                        <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-emerald-400" />
                        <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-emerald-400" />
                        <span className="text-[10px] text-emerald-300 bg-black/70 px-2 py-0.5 rounded-full font-mono">
                          FaceNet Test Target
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center p-6 space-y-2">
                    <div className="w-12 h-12 mx-auto rounded-full bg-[#3c4043]/60 flex items-center justify-center text-gray-400">
                      <Camera size={22} />
                    </div>
                    <p className="text-xs text-gray-400">Camera preview inactive</p>
                    <p className="text-[11px] text-gray-500">
                      Click below to activate camera and run live face match
                    </p>
                  </div>
                )}
              </div>

              {/* Camera Actions */}
              <div className="flex items-center gap-3">
                {!cameraActive ? (
                  <button
                    onClick={startCamera}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-medium text-white transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
                  >
                    <Camera size={15} />
                    <span>Start Camera</span>
                  </button>
                ) : (
                  <>
                    <button
                      onClick={captureAndVerify}
                      disabled={isVerifying}
                      className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-xs font-semibold text-white transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
                    >
                      {isVerifying ? (
                        <>
                          <RefreshCw size={15} className="animate-spin" />
                          <span>Matching Face...</span>
                        </>
                      ) : (
                        <>
                          <ScanFace size={15} />
                          <span>Capture & Verify</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={stopCamera}
                      className="py-2.5 px-4 rounded-xl bg-[#3c4043] hover:bg-[#4a4e52] text-xs font-medium text-gray-300 hover:text-white transition-colors"
                    >
                      Turn Off
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Upload Test Photo Option */}
            <div className="p-6 rounded-2xl bg-[#282a2d] border border-[#3c4043] space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Upload size={18} className="text-blue-400" />
                  <h2 className="text-sm font-semibold text-white">Upload Test Photo</h2>
                </div>
                <span className="text-xs text-gray-400 font-mono">JPG / PNG</span>
              </div>

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[#3c4043] hover:border-blue-500/60 rounded-xl p-5 text-center cursor-pointer transition-colors bg-[#1e1f20]/50 hover:bg-[#1e1f20]"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div className="w-9 h-9 mx-auto rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-2">
                  <Upload size={16} />
                </div>
                <p className="text-xs font-medium text-gray-200">
                  Click to select photo for face verification
                </p>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Upload an image to compare against your enrolled FaceNet embeddings
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Verification Results & Side-by-Side Comparison (6 cols) */}
          <div className="lg:col-span-6 space-y-6">
            <div className="p-6 rounded-2xl bg-[#282a2d] border border-[#3c4043] space-y-6">
              <div className="flex items-center justify-between border-b border-[#3c4043]/60 pb-4">
                <div>
                  <h2 className="text-base font-semibold text-white">Verification Results</h2>
                  <p className="text-xs text-gray-400">FaceNet 512D Cosine Metric comparison</p>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-400 font-mono">
                  <Database size={13} className="text-blue-400" />
                  <span>Neon DB</span>
                </div>
              </div>

              {/* Status Display Area */}
              {isVerifying ? (
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
                  <div className="w-12 h-12 rounded-full border-4 border-blue-500/20 border-t-blue-500 animate-spin" />
                  <p className="text-sm font-medium text-white">Extracting FaceNet 512D Vector...</p>
                  <p className="text-xs text-gray-400">Comparing cosine distance against Neon DB centroid</p>
                </div>
              ) : verificationResult ? (
                <div className="space-y-6 animate-in fade-in duration-300">
                  {/* Verdict Card */}
                  <div
                    className={`p-5 rounded-2xl border flex items-center gap-4 ${
                      verificationResult.matched
                        ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                        : 'bg-red-950/40 border-red-500/40 text-red-300'
                    }`}
                  >
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                        verificationResult.matched
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}
                    >
                      {verificationResult.matched ? (
                        <CheckCircle2 size={26} />
                      ) : (
                        <XCircle size={26} />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold">
                          {verificationResult.matched ? 'FACE MATCH CONFIRMED' : 'FACE DOES NOT MATCH'}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold uppercase ${
                            verificationResult.matched
                              ? 'bg-emerald-500/30 text-emerald-200'
                              : 'bg-red-500/30 text-red-200'
                          }`}
                        >
                          {verificationResult.matched ? 'Verified' : 'Mismatch'}
                        </span>
                      </div>
                      <p className="text-xs opacity-90 mt-0.5">
                        {verificationResult.matched
                          ? `Match confirmed for ${verificationResult.user?.name} (${verificationResult.user?.email})`
                          : 'The face in the test image does not match the enrolled Neon DB user.'}
                      </p>
                    </div>
                  </div>

                  {/* Similarity Metrics */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 rounded-xl bg-[#1e1f20] border border-[#3c4043] text-center">
                      <span className="text-[10px] text-gray-400 uppercase font-mono block">
                        Similarity
                      </span>
                      <span
                        className={`text-lg font-bold font-mono ${
                          verificationResult.matched ? 'text-emerald-400' : 'text-red-400'
                        }`}
                      >
                        {verificationResult.similarity}
                      </span>
                      <span className="text-[10px] text-gray-500 block">Threshold: 0.65</span>
                    </div>

                    <div className="p-3 rounded-xl bg-[#1e1f20] border border-[#3c4043] text-center">
                      <span className="text-[10px] text-gray-400 uppercase font-mono block">
                        Confidence
                      </span>
                      <span className="text-lg font-bold font-mono text-blue-400">
                        {verificationResult.confidence}
                      </span>
                      <span className="text-[10px] text-gray-500 block">Scaled %</span>
                    </div>

                    <div className="p-3 rounded-xl bg-[#1e1f20] border border-[#3c4043] text-center">
                      <span className="text-[10px] text-gray-400 uppercase font-mono block">
                        Distance
                      </span>
                      <span className="text-lg font-bold font-mono text-purple-400">
                        {verificationResult.distance}
                      </span>
                      <span className="text-[10px] text-gray-500 block">Euclidean</span>
                    </div>
                  </div>

                  {/* Side-by-Side Visual Comparison */}
                  <div>
                    <h3 className="text-xs font-semibold text-gray-300 mb-2 uppercase tracking-wider font-mono">
                      Visual Comparison
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      {/* Test Image */}
                      <div className="space-y-1.5 text-center">
                        <span className="text-[11px] text-gray-400">Test Input</span>
                        <div className="aspect-square rounded-xl bg-[#1e1f20] border border-[#3c4043] overflow-hidden flex items-center justify-center">
                          {testImage ? (
                            <img
                              src={testImage}
                              alt="Test face"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-xs text-gray-500">None</span>
                          )}
                        </div>
                      </div>

                      {/* Enrolled Reference Image from Neon DB */}
                      <div className="space-y-1.5 text-center">
                        <span className="text-[11px] text-gray-400">Enrolled (Neon DB)</span>
                        <div className="aspect-square rounded-xl bg-[#1e1f20] border border-[#3c4043] overflow-hidden flex items-center justify-center">
                          {verificationResult.enrolledPhoto ? (
                            <img
                              src={verificationResult.enrolledPhoto}
                              alt="Enrolled face"
                              className="w-full h-full object-cover"
                            />
                          ) : enrollmentStatus?.photos?.[0] ? (
                            <img
                              src={enrollmentStatus.photos[0]}
                              alt="Enrolled face"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-xs text-gray-500">No photo in DB</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Empty state when no test has run yet */
                <div className="py-14 text-center space-y-3">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-[#1e1f20] border border-[#3c4043] flex items-center justify-center text-gray-500">
                    <ScanFace size={28} />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-white">No Verification Run Yet</h3>
                    <p className="text-xs text-gray-400 max-w-xs mx-auto mt-1">
                      Start your camera and click <span className="text-emerald-400">Capture & Verify</span> or upload a photo to test face recognition.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
export default FaceTestingPage;
