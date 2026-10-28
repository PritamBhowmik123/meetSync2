import React, { useState } from 'react';
import { X, Copy, Check, Link as LinkIcon, Shield } from 'lucide-react';

export const MeetingInfoDrawer = ({ roomId, onClose }) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const meetingUrl = `${window.location.origin}?room=${roomId}`;

  const copyToClipboard = async (text, type) => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'code') {
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
      } else {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      }
    } catch (err) {
      console.error('Failed to copy to clipboard', err);
    }
  };

  return (
    <aside className="w-full sm:w-84 md:w-96 bg-[#202124] border-l border-[#3c4043] flex flex-col h-full shadow-2xl z-30 select-text">
      {/* Header */}
      <div className="p-4 border-b border-[#3c4043] flex items-center justify-between">
        <h2 className="text-lg font-medium text-white">Meeting details</h2>
        <button
          onClick={onClose}
          className="p-1.5 rounded-full hover:bg-[#3c4043] text-gray-400 hover:text-white transition-colors"
          title="Close"
        >
          <X size={20} />
        </button>
      </div>

      <div className="p-4 space-y-6 flex-1 overflow-y-auto">
        {/* Joining info */}
        <div>
          <h3 className="text-sm font-medium text-gray-300 mb-2">Joining info</h3>
          <p className="text-xs text-gray-400 mb-3">
            Share this meeting link or code with people you want in the meeting.
          </p>

          {/* Copy Meeting Link */}
          <button
            onClick={() => copyToClipboard(meetingUrl, 'link')}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-[#282a2d] hover:bg-[#32363a] border border-[#3c4043] transition-all text-left group"
          >
            <div className="flex items-center gap-3 truncate pr-2">
              <LinkIcon size={18} className="text-[#8ab4f8] shrink-0" />
              <div className="truncate">
                <p className="text-xs text-gray-400">Meeting Link</p>
                <p className="text-xs text-blue-400 truncate font-mono">{meetingUrl}</p>
              </div>
            </div>
            <span className="shrink-0 p-1.5 rounded-lg bg-[#3c4043] group-hover:bg-[#4a4e52] text-gray-300">
              {copiedLink ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
            </span>
          </button>
        </div>

        {/* Copy Meeting Code */}
        <div>
          <button
            onClick={() => copyToClipboard(roomId, 'code')}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-[#282a2d] hover:bg-[#32363a] border border-[#3c4043] transition-all text-left group"
          >
            <div className="flex items-center gap-3">
              <Shield size={18} className="text-[#8ab4f8] shrink-0" />
              <div>
                <p className="text-xs text-gray-400">Meeting Code</p>
                <p className="text-sm font-semibold text-white tracking-wider font-mono">{roomId}</p>
              </div>
            </div>
            <span className="shrink-0 p-1.5 rounded-lg bg-[#3c4043] group-hover:bg-[#4a4e52] text-gray-300">
              {copiedCode ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
            </span>
          </button>
        </div>
      </div>
    </aside>
  );
};

