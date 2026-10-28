import React, { useEffect, useRef } from 'react';
import { MicOff, User } from 'lucide-react';

export const VideoTile = ({
  stream,
  userName = 'Participant',
  isVideoOn = true,
  isAudioOn = true,
  isLocal = false
}) => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  // Extract initials for fallback avatar
  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Deterministic avatar color based on name
  const getAvatarBg = (name) => {
    const colors = [
      'bg-blue-600',
      'bg-emerald-600',
      'bg-purple-600',
      'bg-amber-600',
      'bg-rose-600',
      'bg-teal-600',
      'bg-indigo-600'
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div className="relative w-full h-full bg-[#3c4043] rounded-2xl overflow-hidden shadow-lg flex items-center justify-center border border-[#4a4d51] group select-none">
      {/* Video Element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          isVideoOn ? 'opacity-100' : 'opacity-0'
        } ${isLocal ? 'mirror-video' : ''}`}
      />

      {/* Fallback Avatar when Camera is OFF */}
      {!isVideoOn && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#202124]">
          <div
            className={`w-24 h-24 sm:w-28 sm:h-28 rounded-full flex items-center justify-center text-white text-3xl font-semibold shadow-2xl ${getAvatarBg(
              userName
            )}`}
          >
            {getInitials(userName)}
          </div>
        </div>
      )}

      {/* Name Tag (Bottom Left) */}
      <div className="absolute bottom-3 left-3 flex items-center gap-2 bg-[#202124]/80 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium text-white max-w-[80%] truncate shadow">
        <span className="truncate">{userName} {isLocal && '(You)'}</span>
      </div>

      {/* Audio Status (Top Right or next to Name) */}
      <div className="absolute top-3 right-3 flex items-center gap-1.5">
        {!isAudioOn && (
          <div className="bg-[#ea4335] p-1.5 rounded-full text-white shadow-md flex items-center justify-center" title="Microphone muted">
            <MicOff size={14} />
          </div>
        )}
      </div>
    </div>
  );
};

