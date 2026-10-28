import React from 'react';
import { X, Mic, MicOff, Video, VideoOff } from 'lucide-react';

export const ParticipantsDrawer = ({
  onClose,
  userName = 'You',
  isAudioOn = true,
  isVideoOn = true,
  remoteParticipants = {}
}) => {
  const remoteList = Object.entries(remoteParticipants).map(([socketId, info]) => ({
    socketId,
    userName: info.userName || 'Participant',
    isAudioOn: info.isAudioOn,
    isVideoOn: info.isVideoOn
  }));

  const totalCount = 1 + remoteList.length;

  return (
    <aside className="w-full sm:w-84 md:w-96 bg-[#202124] border-l border-[#3c4043] flex flex-col h-full shadow-2xl z-30 select-text">
      {/* Header */}
      <div className="p-4 border-b border-[#3c4043] flex items-center justify-between">
        <h2 className="text-lg font-medium text-white">People ({totalCount})</h2>
        <button
          onClick={onClose}
          className="p-1.5 rounded-full hover:bg-[#3c4043] text-gray-400 hover:text-white transition-colors"
          title="Close"
        >
          <X size={20} />
        </button>
      </div>

      {/* Participants List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 py-1">
          In Call
        </div>

        {/* Local User */}
        <div className="flex items-center justify-between p-2.5 rounded-xl hover:bg-[#282a2d] transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center font-medium text-sm text-white shadow">
              {userName.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-medium text-white">{userName} <span className="text-gray-400 text-xs">(You)</span></p>
              <p className="text-xs text-blue-400">Meeting Participant</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-gray-400">
            {isAudioOn ? (
              <span className="p-1.5 text-gray-300" title="Mic is on"><Mic size={16} /></span>
            ) : (
              <span className="p-1.5 text-[#ea4335]" title="Mic is off"><MicOff size={16} /></span>
            )}
            {isVideoOn ? (
              <span className="p-1.5 text-gray-300" title="Camera is on"><Video size={16} /></span>
            ) : (
              <span className="p-1.5 text-[#ea4335]" title="Camera is off"><VideoOff size={16} /></span>
            )}
          </div>
        </div>

        {/* Remote Participants */}
        {remoteList.map((participant) => (
          <div
            key={participant.socketId}
            className="flex items-center justify-between p-2.5 rounded-xl hover:bg-[#282a2d] transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-emerald-600 flex items-center justify-center font-medium text-sm text-white shadow">
                {participant.userName.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-medium text-white">{participant.userName}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-gray-400">
              {participant.isAudioOn ? (
                <span className="p-1.5 text-gray-300" title="Mic is on"><Mic size={16} /></span>
              ) : (
                <span className="p-1.5 text-[#ea4335]" title="Mic is off"><MicOff size={16} /></span>
              )}
              {participant.isVideoOn ? (
                <span className="p-1.5 text-gray-300" title="Camera is on"><Video size={16} /></span>
              ) : (
                <span className="p-1.5 text-[#ea4335]" title="Camera is off"><VideoOff size={16} /></span>
              )}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
};

