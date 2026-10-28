import React from 'react';
import { Captions } from 'lucide-react';

export const CaptionsOverlay = ({ activeCaption, isCaptionsOn, isSupported }) => {
  if (!isCaptionsOn) return null;

  // If browser doesn't support Web Speech API
  if (!isSupported) {
    return (
      <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-30 max-w-lg w-auto px-4 py-2 bg-[#202124]/95 border border-amber-500/40 rounded-xl shadow-2xl backdrop-blur-md text-amber-300 text-xs text-center">
        Live captions require Chrome, Edge, Safari, or Brave browser.
      </div>
    );
  }

  // If no one is actively speaking, keep overlay hidden
  if (!activeCaption || !activeCaption.text) {
    return null;
  }

  return (
    <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-30 max-w-2xl w-[90%] sm:w-auto px-5 py-3 bg-[#202124]/90 border border-[#3c4043] rounded-2xl shadow-2xl backdrop-blur-md transition-all duration-300 animate-fade-in pointer-events-none select-none">
      <div className="flex items-start gap-3">
        {/* Captions Icon / Speaker Tag */}
        <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
          <div className="bg-[#1a73e8]/20 border border-[#1a73e8]/50 px-2 py-0.5 rounded-md flex items-center gap-1.5">
            <Captions size={13} className="text-[#8ab4f8]" />
            <span className="text-xs font-semibold text-[#8ab4f8] max-w-[120px] truncate">
              {activeCaption.senderName}
            </span>
          </div>
        </div>

        {/* Spoken Text */}
        <p className="text-sm sm:text-base font-normal text-white leading-relaxed tracking-wide drop-shadow break-words">
          {activeCaption.text}
          {!activeCaption.isFinal && (
            <span className="inline-block w-1.5 h-4 bg-[#8ab4f8] ml-1.5 animate-pulse align-middle" />
          )}
        </p>
      </div>
    </div>
  );
};
