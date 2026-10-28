import React, { useState, useEffect, useRef } from 'react';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Keyboard,
  Plus,
  ShieldCheck,
  LogOut,
  Calendar,
  History,
  X,
  Copy,
  Check,
  ScanFace,
  UserCheck
} from 'lucide-react';
import { authService } from '../services/auth';

export const Lobby = ({
  currentUser,
  onLogout,
  onJoinMeeting,
  initialRoomId = '',
  onNavigateToEnrollment,
  onNavigateToTesting
}) => {
  const [userName, setUserName] = useState(currentUser?.name || '');
  const [inputRoomId, setInputRoomId] = useState(initialRoomId);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [previewStream, setPreviewStream] = useState(null);
  const [mediaError, setMediaError] = useState(null);
  const [currentTime, setCurrentTime] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [meetings, setMeetings] = useState([]);
  const [copiedCode, setCopiedCode] = useState(null);

  const videoRef = useRef(null);

  // Time ticker
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric'
        }) +
          ' • ' +
          now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Sync user name if currentUser changes
  useEffect(() => {
    if (currentUser?.name) {
      setUserName(currentUser.name);
    }
  }, [currentUser]);

  // Load user meetings when history opened
  useEffect(() => {
    if (showHistory) {
      authService.getMeetings().then((list) => {
        setMeetings(list);
      });
    }
  }, [showHistory]);

  // Request preview camera & microphone
  useEffect(() => {
    let streamInstance = null;
    let isCancelled = false;

    const startPreview = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
          audio: true
        });

        if (isCancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamInstance = stream;
        setPreviewStream(stream);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.warn('Lobby camera preview error:', err);
        setMediaError('Camera or microphone access was not granted or not available.');
      }
    };

    startPreview();

    return () => {
      isCancelled = true;
      if (streamInstance) {
        streamInstance.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // Sync track enablement with state
  useEffect(() => {
    if (previewStream) {
      previewStream.getVideoTracks().forEach((track) => {
        track.enabled = isVideoOn;
      });
    }
  }, [isVideoOn, previewStream]);

  useEffect(() => {
    if (previewStream) {
      previewStream.getAudioTracks().forEach((track) => {
        track.enabled = isAudioOn;
      });
    }
  }, [isAudioOn, previewStream]);

  // Generate 3-segment room code e.g. "abc-defg-hij"
  const generateRoomId = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyz';
    const segment = (len) =>
      Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    return `${segment(3)}-${segment(4)}-${segment(3)}`;
  };

  const handleCreateNewMeeting = async () => {
    const cleanName = userName.trim() || currentUser?.name || 'Host';
    const newRoom = generateRoomId();

    // Record meeting into Neon DB Storage
    await authService.recordMeeting(`Meeting by ${cleanName}`, newRoom);

    // Release preview stream before transitioning
    if (previewStream) {
      previewStream.getTracks().forEach((t) => t.stop());
    }

    onJoinMeeting({
      roomId: newRoom,
      userName: cleanName,
      isVideoOn,
      isAudioOn
    });
  };

  const handleJoinExisting = (e) => {
    if (e) e.preventDefault();
    if (!inputRoomId.trim()) return;

    let targetRoom = inputRoomId.trim();
    // Support pasting full URL
    try {
      if (targetRoom.includes('http') || targetRoom.includes('?room=')) {
        const url = new URL(targetRoom);
        const param = url.searchParams.get('room');
        if (param) targetRoom = param;
      }
    } catch {
      // not a url, use as code
    }

    const cleanName = userName.trim() || currentUser?.name || 'Participant';

    // Release preview stream before transitioning
    if (previewStream) {
      previewStream.getTracks().forEach((t) => t.stop());
    }

    onJoinMeeting({
      roomId: targetRoom,
      userName: cleanName,
      isVideoOn,
      isAudioOn
    });
  };

  const handleCopyCode = async (code) => {
    await navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleNavigateToEnrollment = () => {
    if (previewStream) {
      previewStream.getTracks().forEach((t) => t.stop());
      setPreviewStream(null);
    }
    onNavigateToEnrollment?.();
  };

  const handleNavigateToTesting = () => {
    if (previewStream) {
      previewStream.getTracks().forEach((t) => t.stop());
      setPreviewStream(null);
    }
    onNavigateToTesting?.();
  };

  return (
    <div className="min-h-screen bg-[#202124] text-white flex flex-col justify-between select-none">
      {/* Top Navbar */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-[#3c4043]/40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Video className="text-white" size={22} />
          </div>
          <span className="text-xl font-medium tracking-tight text-gray-200">
            Meet<span className="text-[#8ab4f8]">Sync</span>
          </span>
        </div>

        {/* Right side user info & actions */}
        <div className="flex items-center gap-4">
          <span className="hidden md:inline text-xs text-gray-400 font-medium">
            {currentTime}
          </span>

          {/* Meeting History Button */}
          <button
            onClick={() => setShowHistory(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#282a2d] hover:bg-[#3c4043] border border-[#3c4043] text-xs font-medium text-gray-300 hover:text-white transition-colors"
            title="Meeting History"
          >
            <History size={14} className="text-[#8ab4f8]" />
            <span className="hidden sm:inline">My Meetings</span>
          </button>

          {/* Face Enrollment Button */}
          <button
            onClick={handleNavigateToEnrollment}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/40 text-xs font-medium text-blue-200 transition-colors"
            title="Face Enrollment (FaceNet 512D)"
          >
            <ScanFace size={14} className="text-blue-400" />
            <span className="hidden sm:inline">Face Enrollment</span>
          </button>

          {/* Face Testing Button */}
          <button
            onClick={handleNavigateToTesting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/40 border border-emerald-500/40 text-xs font-medium text-emerald-200 transition-colors"
            title="Face Recognition Testing"
          >
            <UserCheck size={14} className="text-emerald-400" />
            <span className="hidden sm:inline">Face Testing</span>
          </button>

          {/* User Profile Pill */}
          <div className="flex items-center gap-2 pl-2 border-l border-[#3c4043]">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-semibold text-white">
              {currentUser?.name ? currentUser.name.slice(0, 2).toUpperCase() : 'ME'}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-medium text-white leading-none">{currentUser?.name}</p>
              <p className="text-[10px] text-gray-400 mt-0.5 leading-none">{currentUser?.email}</p>
            </div>
            <button
              onClick={onLogout}
              className="p-1.5 rounded-lg hover:bg-[#3c4043] text-gray-400 hover:text-red-400 transition-colors ml-1"
              title="Sign Out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl w-full mx-auto px-6 py-8 flex-1 flex flex-col lg:flex-row items-center justify-center gap-12 lg:gap-16">
        {/* Left Column: Information & Actions */}
        <div className="flex-1 max-w-xl text-center lg:text-left space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#3c4043]/60 border border-[#5f6368]/40 text-xs text-blue-300 font-medium">
            <ShieldCheck size={14} className="text-green-400" />
            Authenticated with Neon DB Storage
          </div>

          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-white leading-tight">
            Video meetings and classes for everyone.
          </h1>

          <p className="text-base sm:text-lg text-gray-400">
            Connect with friends, team members, or students. Enjoy clear video and audio with zero complicated setup.
          </p>

          {/* Name Input */}
          <div className="space-y-1.5 pt-2">
            <label className="text-xs font-medium text-gray-300 block">Your Display Name in Meeting</label>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="Enter your name"
              className="w-full sm:max-w-md px-4 py-3 rounded-xl bg-[#282a2d] border border-[#5f6368] focus:border-[#8ab4f8] focus:outline-none text-white text-sm placeholder-gray-500 transition-colors shadow-inner"
            />
          </div>

          {/* Action Row */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
            <button
              onClick={handleCreateNewMeeting}
              className="px-6 py-3.5 rounded-xl bg-[#1a73e8] hover:bg-[#1765cc] text-white font-medium text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-900/30 active:scale-[0.98]"
            >
              <Plus size={18} />
              <span>New meeting</span>
            </button>

            {/* Join with code */}
            <form onSubmit={handleJoinExisting} className="flex items-center gap-2 flex-1 sm:max-w-xs">
              <div className="relative flex-1">
                <Keyboard size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={inputRoomId}
                  onChange={(e) => setInputRoomId(e.target.value)}
                  placeholder="Enter meeting code"
                  className="w-full pl-10 pr-3 py-3 rounded-xl bg-[#282a2d] border border-[#5f6368] focus:border-[#8ab4f8] focus:outline-none text-white text-sm placeholder-gray-500 font-mono transition-colors"
                />
              </div>
              <button
                type="submit"
                disabled={!inputRoomId.trim()}
                className="px-4 py-3 rounded-xl bg-[#3c4043] hover:bg-[#4a4e52] disabled:opacity-40 disabled:hover:bg-[#3c4043] text-[#8ab4f8] font-medium text-sm transition-all"
                title="Join meeting"
              >
                Join
              </button>
            </form>
          </div>

          {/* FaceNet Biometrics Quick Access Card */}
          <div className="pt-4 border-t border-[#3c4043]/50">
            <div className="p-4 rounded-2xl bg-[#282a2d]/70 border border-[#3c4043] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                  <ScanFace size={20} />
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-white flex items-center gap-2">
                    FaceNet Face Recognition
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono">Neon DB</span>
                  </h3>
                  <p className="text-[11px] text-gray-400">
                    Enroll up to 5 photos or test face verification via webcam/upload
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleNavigateToEnrollment}
                  className="flex-1 sm:flex-initial px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors text-center"
                >
                  Enroll Face
                </button>
                <button
                  type="button"
                  onClick={handleNavigateToTesting}
                  className="flex-1 sm:flex-initial px-3 py-1.5 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/40 text-emerald-200 text-xs font-medium transition-colors text-center"
                >
                  Test Face
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Camera & Mic Preview Card */}
        <div className="w-full max-w-md flex flex-col items-center">
          <div className="w-full aspect-[4/3] bg-[#282a2d] rounded-2xl overflow-hidden relative shadow-2xl border border-[#3c4043] flex items-center justify-center">
            {/* Live Video Preview */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover mirror-video transition-opacity duration-300 ${
                isVideoOn && !mediaError ? 'opacity-100' : 'opacity-0'
              }`}
            />

            {/* Video Off Fallback */}
            {(!isVideoOn || mediaError) && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#282a2d] p-6 text-center">
                <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center text-white text-2xl font-bold mb-3 shadow-lg">
                  {userName ? userName.slice(0, 2).toUpperCase() : 'ME'}
                </div>
                <p className="text-sm font-medium text-gray-300">
                  {mediaError ? 'Camera unavailable' : 'Camera is off'}
                </p>
                {mediaError && (
                  <p className="text-xs text-gray-500 mt-1 max-w-xs">{mediaError}</p>
                )}
              </div>
            )}

            {/* Bottom Controls Floating on Preview */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-[#202124]/80 backdrop-blur-md px-4 py-2 rounded-full border border-[#4a4e52]/40 shadow-xl">
              {/* Mic toggle */}
              <button
                type="button"
                onClick={() => setIsAudioOn((prev) => !prev)}
                className={`p-3 rounded-full transition-colors ${
                  isAudioOn
                    ? 'bg-[#3c4043] hover:bg-[#4a4e52] text-white'
                    : 'bg-[#ea4335] hover:bg-[#d93025] text-white'
                }`}
                title={isAudioOn ? 'Mute preview microphone' : 'Unmute preview microphone'}
              >
                {isAudioOn ? <Mic size={18} /> : <MicOff size={18} />}
              </button>

              {/* Camera toggle */}
              <button
                type="button"
                onClick={() => setIsVideoOn((prev) => !prev)}
                className={`p-3 rounded-full transition-colors ${
                  isVideoOn
                    ? 'bg-[#3c4043] hover:bg-[#4a4e52] text-white'
                    : 'bg-[#ea4335] hover:bg-[#d93025] text-white'
                }`}
                title={isVideoOn ? 'Turn off preview camera' : 'Turn on preview camera'}
              >
                {isVideoOn ? <Video size={18} /> : <VideoOff size={18} />}
              </button>
            </div>
          </div>

          <p className="text-xs text-gray-500 mt-3 text-center">
            Check your audio and video before entering the meeting
          </p>
        </div>
      </main>

      {/* Meeting History Modal */}
      {showHistory && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#282a2d] border border-[#3c4043] rounded-3xl p-6 shadow-2xl flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between pb-4 border-b border-[#3c4043]">
              <div className="flex items-center gap-2">
                <Calendar size={18} className="text-[#8ab4f8]" />
                <h2 className="text-base font-semibold text-white">Stored Meetings</h2>
              </div>
              <button
                onClick={() => setShowHistory(false)}
                className="p-1 rounded-full hover:bg-[#3c4043] text-gray-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-3 select-text">
              {meetings.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-6">No meetings stored yet.</p>
              ) : (
                meetings.map((m) => (
                  <div
                    key={m.id || m.code}
                    className="p-3.5 rounded-2xl bg-[#202124] border border-[#3c4043] flex items-center justify-between gap-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-white">{m.title}</p>
                      <p className="text-xs text-gray-400 font-mono mt-0.5">Code: {m.code}</p>
                      <p className="text-[10px] text-gray-500 mt-1">
                        {new Date(m.created_at).toLocaleDateString()} at{' '}
                        {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCopyCode(m.code)}
                        className="p-2 rounded-xl bg-[#3c4043] hover:bg-[#4a4e52] text-gray-300 hover:text-white transition-colors"
                        title="Copy Code"
                      >
                        {copiedCode === m.code ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                      </button>
                      <button
                        onClick={() => {
                          setShowHistory(false);
                          setInputRoomId(m.code);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-[#1a73e8] hover:bg-[#1765cc] text-white text-xs font-medium"
                      >
                        Select
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-gray-500 border-t border-[#3c4043]/30">
        MeetSync • Authenticated with Neon DB Storage
      </footer>
    </div>
  );
};
