import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  Upload,
  Trash2,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  ScanFace,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  Database,
  Info
} from 'lucide-react';
import { faceService } from '../services/face';

export const FaceEnrollmentPage = ({
  currentUser,
  onBack,
  onNavigateToTesting
}) => {
  const [photos, setPhotos] = useState([]); // array of base64 strings
  const [cameraActive, setCameraActive] = useState(false);
  const [stream, setStream] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);
  const [existingEnrollment, setExistingEnrollment] = useState(null);
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error', message: '' }
  const [cameraError, setCameraError] = useState(null);

  const videoRef = useRef(null);
  const fileInputRef = useRef(null);

  // Load existing enrollment from Neon DB
  useEffect(() => {
    loadEnrollmentStatus();
  }, []);

  const loadEnrollmentStatus = async () => {
    setStatusLoading(true);
    try {
      const status = await faceService.getStatus();
      if (status && status.enrolled) {
        setExistingEnrollment(status);
      } else {
        setExistingEnrollment(null);
      }
    } catch (err) {
      console.warn('Could not load enrollment status:', err);
    } finally {
      setStatusLoading(false);
    }
  };

  // Start webcam
  const startCamera = async () => {
    setCameraError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false
      });
      setStream(mediaStream);
      setCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play().catch(console.warn);
      }
    } catch (err) {
      console.error('Camera access error:', err);
      setCameraError('Unable to access webcam. Please verify camera permissions.');
    }
  };

  // Sync stream to video element whenever stream changes
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch((err) => {
        console.warn('Video play error:', err);
      });
    }
  }, [stream]);

  // Stop webcam
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  // Cleanup webcam when unmounting
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  // Capture snapshot from webcam
  const capturePhoto = () => {
    if (photos.length >= 5) {
      setFeedback({ type: 'error', message: 'You can upload or capture up to 5 photos maximum.' });
      return;
    }

    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);

    setPhotos((prev) => [...prev, dataUrl]);
    setFeedback({ type: 'success', message: `Photo ${photos.length + 1} captured successfully!` });
  };

  // Handle file uploads
  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const remainingSlots = 5 - photos.length;
    if (remainingSlots <= 0) {
      setFeedback({ type: 'error', message: 'You have reached the maximum limit of 5 photos.' });
      return;
    }

    const filesToProcess = files.slice(0, remainingSlots);

    filesToProcess.forEach((file) => {
      if (!file.type.startsWith('image/')) {
        setFeedback({ type: 'error', message: `Skipped ${file.name} because it is not an image.` });
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result;
        if (dataUrl) {
          setPhotos((prev) => {
            if (prev.length >= 5) return prev;
            return [...prev, dataUrl];
          });
        }
      };
      reader.readAsDataURL(file);
    });

    if (files.length > remainingSlots) {
      setFeedback({
        type: 'error',
        message: `Only ${remainingSlots} photo(s) added. Maximum limit is 5 photos.`
      });
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Remove photo from selection
  const removePhoto = (index) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  // Submit enrollment to Backend & Neon DB
  const handleEnrollSubmit = async () => {
    if (photos.length === 0) {
      setFeedback({ type: 'error', message: 'Please add at least 1 photo to enroll.' });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const res = await faceService.enrollFaces(photos);
      setFeedback({
        type: 'success',
        message: `Successfully enrolled with FaceNet (512D) into Neon DB! ${photos.length} photo(s) processed.`
      });
      // Clear draft photos and refresh existing enrollment
      setPhotos([]);
      stopCamera();
      await loadEnrollmentStatus();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.message || 'Face enrollment failed. Please ensure faces are clear and well lit.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete existing enrollment
  const handleDeleteEnrollment = async () => {
    if (!window.confirm('Are you sure you want to delete your enrolled FaceNet data from Neon DB?')) {
      return;
    }

    try {
      await faceService.deleteEnrollment();
      setExistingEnrollment(null);
      setFeedback({ type: 'success', message: 'Face enrollment removed from Neon DB.' });
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Failed to remove face enrollment.' });
    }
  };

  return (
    <div className="min-h-screen bg-[#202124] text-white flex flex-col justify-between select-none">
      {/* Top Navbar */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-[#3c4043]/40 bg-[#202124]/90 backdrop-blur sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              stopCamera();
              onBack();
            }}
            className="p-2 rounded-xl bg-[#282a2d] hover:bg-[#3c4043] border border-[#3c4043] text-gray-300 hover:text-white transition-colors flex items-center gap-2 text-sm"
          >
            <ArrowLeft size={16} />
            <span>Back to Lobby</span>
          </button>
          <div className="h-5 w-px bg-[#3c4043]" />
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center">
              <ScanFace size={18} className="text-blue-400" />
            </div>
            <div>
              <h1 className="text-base font-semibold leading-tight text-white flex items-center gap-2">
                Face Enrollment
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  FaceNet 512D
                </span>
              </h1>
              <p className="text-xs text-gray-400">Enroll up to 5 photos stored in Neon DB</p>
            </div>
          </div>
        </div>

        {/* Right Action: Testing Page Shortcut */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              stopCamera();
              onNavigateToTesting();
            }}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-xs font-medium text-white shadow-lg shadow-emerald-500/20 transition-all"
          >
            <Sparkles size={14} />
            <span>Go to Face Testing</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl w-full mx-auto px-6 py-8 flex-1 space-y-8">
        {/* Banner notification */}
        {feedback && (
          <div
            className={`p-4 rounded-2xl flex items-center gap-3 text-sm border animate-in fade-in duration-200 ${
              feedback.type === 'success'
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                : 'bg-red-950/40 border-red-500/40 text-red-300'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle size={18} className="text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle size={18} className="text-red-400 shrink-0" />
            )}
            <p className="flex-1">{feedback.message}</p>
            <button
              onClick={() => setFeedback(null)}
              className="text-xs opacity-70 hover:opacity-100 uppercase font-mono ml-2"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Existing Enrollment Status Card */}
        {existingEnrollment && (
          <div className="p-5 rounded-2xl bg-[#282a2d]/80 border border-emerald-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
                <CheckCircle size={24} className="text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-white">Active FaceNet Enrollment in Neon DB</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-medium">
                    Enrolled
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  User: <span className="text-gray-200 font-medium">{currentUser?.name}</span> ({currentUser?.email}) •{' '}
                  {existingEnrollment.photoCount} reference photo(s) enrolled • 512D Vector centroid stored.
                </p>
                {existingEnrollment.updatedAt && (
                  <p className="text-[11px] text-gray-500 mt-1">
                    Last updated: {new Date(existingEnrollment.updatedAt).toLocaleString()}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 self-end md:self-auto">
              {existingEnrollment.photos && existingEnrollment.photos.length > 0 && (
                <div className="flex -space-x-2 overflow-hidden py-1">
                  {existingEnrollment.photos.map((p, idx) => (
                    <img
                      key={idx}
                      src={p}
                      alt={`Enrolled ${idx + 1}`}
                      className="inline-block h-10 w-10 rounded-full ring-2 ring-[#282a2d] object-cover"
                    />
                  ))}
                </div>
              )}
              <button
                onClick={handleDeleteEnrollment}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-500/40 text-xs font-medium text-red-300 transition-colors"
                title="Remove enrollment"
              >
                <Trash2 size={13} />
                <span>Reset</span>
              </button>
            </div>
          </div>
        )}

        {/* Grid: Left (Capture / Upload methods) & Right (Selected Photos & Action) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left: Input options (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Webcam Live Capture Section */}
            <div className="p-6 rounded-2xl bg-[#282a2d] border border-[#3c4043] space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Camera size={18} className="text-blue-400" />
                  <h2 className="text-sm font-semibold text-white">Capture with Webcam</h2>
                </div>
                {cameraActive && (
                  <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Camera Live
                  </span>
                )}
              </div>

              {cameraError && (
                <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-xs text-red-300">
                  {cameraError}
                </div>
              )}

              {/* Viewfinder */}
              <div className="relative aspect-video rounded-xl bg-[#1e1f20] border border-[#3c4043] overflow-hidden flex items-center justify-center">
                {/* Always-mounted video stream element */}
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover -scale-x-100 transition-opacity duration-300 ${
                    cameraActive ? 'opacity-100' : 'opacity-0 absolute pointer-events-none'
                  }`}
                />

                {/* Face boundary overlay guideline when camera active */}
                {cameraActive && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-48 h-64 border-2 border-dashed border-blue-400/60 rounded-full flex flex-col items-center justify-between py-4">
                      <span className="text-[10px] text-blue-300 bg-black/60 px-2 py-0.5 rounded-full font-mono">
                        Center Face Here
                      </span>
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-ping" />
                      <span className="text-[10px] text-gray-300 bg-black/60 px-2 py-0.5 rounded-full">
                        FaceNet Alignment
                      </span>
                    </div>
                  </div>
                )}

                {/* Idle placeholder when camera inactive */}
                {!cameraActive && (
                  <div className="text-center p-6 space-y-2">
                    <div className="w-12 h-12 mx-auto rounded-full bg-[#3c4043]/60 flex items-center justify-center text-gray-400">
                      <Camera size={22} />
                    </div>
                    <p className="text-xs text-gray-400">Webcam is currently idle</p>
                    <p className="text-[11px] text-gray-500">
                      Start your camera to capture live facial snapshots
                    </p>
                  </div>
                )}
              </div>

              {/* Camera Action Buttons */}
              <div className="flex items-center gap-3 pt-1">
                {!cameraActive ? (
                  <button
                    onClick={startCamera}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-medium text-white transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
                  >
                    <Camera size={15} />
                    <span>Open Camera</span>
                  </button>
                ) : (
                  <>
                    <button
                      onClick={capturePhoto}
                      disabled={photos.length >= 5}
                      className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:pointer-events-none text-xs font-medium text-white transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
                    >
                      <Camera size={15} />
                      <span>Snap Photo ({photos.length}/5)</span>
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

            {/* File Upload Section */}
            <div className="p-6 rounded-2xl bg-[#282a2d] border border-[#3c4043] space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Upload size={18} className="text-indigo-400" />
                  <h2 className="text-sm font-semibold text-white">Upload Photos from Device</h2>
                </div>
                <span className="text-xs text-gray-400 font-mono">JPG, PNG, WebP</span>
              </div>

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[#3c4043] hover:border-indigo-500/60 rounded-xl p-6 text-center cursor-pointer transition-colors bg-[#1e1f20]/50 hover:bg-[#1e1f20]"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div className="w-10 h-10 mx-auto rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-2">
                  <Upload size={18} />
                </div>
                <p className="text-xs font-medium text-gray-200">
                  Click to select photos or drag & drop files
                </p>
                <p className="text-[11px] text-gray-500 mt-1">
                  Upload up to 5 clear face portraits with different lighting or angles
                </p>
              </div>
            </div>
          </div>

          {/* Right: Selected Photos Tray & Enrollment Execution (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="p-6 rounded-2xl bg-[#282a2d] border border-[#3c4043] space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-white">Enrollment Batch</h2>
                  <p className="text-xs text-gray-400">Photos ready for FaceNet processing</p>
                </div>
                <span
                  className={`text-xs px-2.5 py-1 rounded-full font-mono font-medium ${
                    photos.length === 5
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : photos.length > 0
                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                      : 'bg-[#3c4043] text-gray-400'
                  }`}
                >
                  {photos.length} / 5 Photos
                </span>
              </div>

              {/* Photo Slots Grid */}
              <div className="grid grid-cols-3 gap-3">
                {[0, 1, 2, 3, 4].map((slotIdx) => {
                  const photoSrc = photos[slotIdx];
                  return (
                    <div
                      key={slotIdx}
                      className="relative aspect-square rounded-xl bg-[#1e1f20] border border-[#3c4043] overflow-hidden flex items-center justify-center group"
                    >
                      {photoSrc ? (
                        <>
                          <img
                            src={photoSrc}
                            alt={`Upload slot ${slotIdx + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button
                              onClick={() => removePhoto(slotIdx)}
                              className="p-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white transition-colors"
                              title="Remove photo"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                          <span className="absolute bottom-1 left-1 bg-black/60 text-[9px] px-1.5 py-0.5 rounded font-mono text-gray-200">
                            #{slotIdx + 1}
                          </span>
                        </>
                      ) : (
                        <div className="text-center p-2 text-gray-600 flex flex-col items-center">
                          <span className="text-xs font-mono font-semibold">#{slotIdx + 1}</span>
                          <span className="text-[10px] text-gray-500">Empty</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Architecture Info Callout */}
              <div className="p-3.5 rounded-xl bg-[#1e1f20] border border-[#3c4043] space-y-2 text-xs text-gray-300">
                <div className="flex items-center gap-2 text-blue-300 font-medium">
                  <Database size={14} />
                  <span>Neon DB Vector Pipeline</span>
                </div>
                <ul className="text-[11px] text-gray-400 space-y-1 list-disc list-inside">
                  <li>YuNet detects face bounding box & landmarks</li>
                  <li>Inception-ResNet FaceNet generates 512D unit embedding</li>
                  <li>Multi-photo batch computes normalized centroid vector</li>
                  <li>Saved to Neon DB table <code className="text-gray-300">face_embeddings</code></li>
                </ul>
              </div>

              {/* Submit Enrollment Button */}
              <div className="pt-2">
                <button
                  onClick={handleEnrollSubmit}
                  disabled={photos.length === 0 || isSubmitting}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-40 disabled:pointer-events-none text-xs sm:text-sm font-semibold text-white transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      <span>Computing 512D FaceNet Vectors...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={16} />
                      <span>
                        {existingEnrollment ? 'Update FaceNet Enrollment' : 'Enroll Face in Neon DB'}
                      </span>
                    </>
                  )}
                </button>
                {photos.length === 0 && (
                  <p className="text-[11px] text-gray-500 text-center mt-2">
                    Capture or upload 1 to 5 photos above to enable enrollment
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
export default FaceEnrollmentPage;

