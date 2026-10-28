import React, { useState, useEffect } from 'react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  MessageSquare,
  Users,
  Info
} from 'lucide-react';

export const ControlsBar = ({
  roomId,
  isVideoOn,
  isAudioOn,
  toggleVideo,
  toggleAudio,
  onLeaveMeeting,
  activeSidebar,
  setActiveSidebar,
  participantsCount = 1,
  unreadCount = 0
}) => {
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const toggleSidebar = (name) => {
    if (activeSidebar === name) {
      setActiveSidebar(null);
    } else {
      setActiveSidebar(name);
    }
  };

  return (
    <footer className="h-20 bg-[#202124] border-t border-[#3c4043] px-4 sm:px-6 flex items-center justify-between z-20">
      {/* Left: Time & Room ID */}
      <div className="hidden md:flex items-center gap-3 text-sm font-medium text-gray-300">
        <span>{currentTime}</span>
        <span className="text-gray-500">|</span>
        <span className="font-mono tracking-wider text-gray-200">{roomId}</span>
      </div>

      {/* Center: Main Media & Leave Controls */}
      <div className="flex items-center gap-3 sm:gap-4 mx-auto md:mx-0">
        {/* Microphone Toggle */}
        <button
          onClick={toggleAudio}
          className={`p-3.5 rounded-full transition-all duration-200 flex items-center justify-center ${
            isAudioOn
              ? 'bg-[#3c4043] hover:bg-[#4a4e52] text-white'
              : 'bg-[#ea4335] hover:bg-[#d93025] text-white shadow-lg shadow-red-900/30'
          }`}
          title={isAudioOn ? 'Turn off microphone' : 'Turn on microphone'}
          aria-label={isAudioOn ? 'Turn off microphone' : 'Turn on microphone'}
        >
          {isAudioOn ? <Mic size={20} /> : <MicOff size={20} />}
        </button>

        {/* Camera Toggle */}
        <button
          onClick={toggleVideo}
          className={`p-3.5 rounded-full transition-all duration-200 flex items-center justify-center ${
            isVideoOn
              ? 'bg-[#3c4043] hover:bg-[#4a4e52] text-white'
              : 'bg-[#ea4335] hover:bg-[#d93025] text-white shadow-lg shadow-red-900/30'
          }`}
          title={isVideoOn ? 'Turn off camera' : 'Turn on camera'}
          aria-label={isVideoOn ? 'Turn off camera' : 'Turn on camera'}
        >
          {isVideoOn ? <Video size={20} /> : <VideoOff size={20} />}
        </button>

        {/* Leave Meeting (End Call) */}
        <button
          onClick={onLeaveMeeting}
          className="px-5 py-3 rounded-full bg-[#ea4335] hover:bg-[#d93025] text-white transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-red-900/40"
          title="Leave meeting"
          aria-label="Leave meeting"
        >
          <PhoneOff size={20} />
          <span className="hidden sm:inline font-medium text-sm">Leave</span>
        </button>
      </div>

      {/* Right: Info, Participants, Chat toggles */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Meeting Info button */}
        <button
          onClick={() => toggleSidebar('info')}
          className={`p-3 rounded-full transition-colors ${
            activeSidebar === 'info'
              ? 'bg-[#8ab4f8] text-[#202124]'
              : 'hover:bg-[#3c4043] text-gray-300 hover:text-white'
          }`}
          title="Meeting details"
          aria-label="Meeting details"
        >
          <Info size={20} />
        </button>

        {/* People/Participants button */}
        <button
          onClick={() => toggleSidebar('participants')}
          className={`relative p-3 rounded-full transition-colors ${
            activeSidebar === 'participants'
              ? 'bg-[#8ab4f8] text-[#202124]'
              : 'hover:bg-[#3c4043] text-gray-300 hover:text-white'
          }`}
          title="People"
          aria-label="People"
        >
          <Users size={20} />
          {participantsCount > 1 && (
            <span className="absolute -top-1 -right-1 bg-[#1a73e8] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {participantsCount}
            </span>
          )}
        </button>

        {/* Chat button */}
        <button
          onClick={() => toggleSidebar('chat')}
          className={`relative p-3 rounded-full transition-colors ${
            activeSidebar === 'chat'
              ? 'bg-[#8ab4f8] text-[#202124]'
              : 'hover:bg-[#3c4043] text-gray-300 hover:text-white'
          }`}
          title="In-call messages"
          aria-label="In-call messages"
        >
          <MessageSquare size={20} />
          {unreadCount > 0 && activeSidebar !== 'chat' && (
            <span className="absolute -top-1 -right-1 bg-[#ea4335] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full animate-pulse">
              {unreadCount}
            </span>
          )}
        </button>
      </div>
    </footer>
  );
};

