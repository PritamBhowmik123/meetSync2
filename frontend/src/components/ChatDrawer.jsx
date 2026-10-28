import React, { useState, useRef, useEffect } from 'react';
import { X, Send } from 'lucide-react';

export const ChatDrawer = ({ messages = [], onSendMessage, onClose, currentSocketId }) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText);
    setInputText('');
  };

  return (
    <aside className="w-full sm:w-84 md:w-96 bg-[#202124] border-l border-[#3c4043] flex flex-col h-full shadow-2xl z-30 select-text">
      {/* Header */}
      <div className="p-4 border-b border-[#3c4043] flex items-center justify-between">
        <h2 className="text-lg font-medium text-white">In-call messages</h2>
        <button
          onClick={onClose}
          className="p-1.5 rounded-full hover:bg-[#3c4043] text-gray-400 hover:text-white transition-colors"
          title="Close chat"
        >
          <X size={20} />
        </button>
      </div>

      {/* Info notice */}
      <div className="bg-[#282a2d] m-3 p-3 rounded-lg text-xs text-gray-400 border border-[#3c4043]">
        Messages can only be seen by people in the meeting and are cleared when the call ends.
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 p-6">
            <p className="text-sm">No messages yet.</p>
            <p className="text-xs text-gray-500 mt-1">Send a message to everyone in the meeting.</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderSocketId === currentSocketId;
            return (
              <div key={msg.id} className="flex flex-col">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-xs font-semibold text-gray-300">
                    {msg.senderName} {isMe && <span className="text-gray-500 font-normal">(You)</span>}
                  </span>
                  <span className="text-[10px] text-gray-500">{msg.timestamp}</span>
                </div>
                <div
                  className={`p-3 rounded-xl text-sm break-words ${
                    isMe
                      ? 'bg-[#1a73e8] text-white self-start rounded-tl-sm'
                      : 'bg-[#3c4043] text-gray-100 self-start rounded-tl-sm'
                  }`}
                >
                  {msg.message}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-[#3c4043] bg-[#202124]">
        <div className="flex items-center gap-2 bg-[#282a2d] rounded-full px-4 py-2 border border-[#3c4043] focus-within:border-[#8ab4f8]">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Send a message to everyone"
            className="flex-1 bg-transparent text-sm text-white focus:outline-none placeholder-gray-500"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="text-[#8ab4f8] disabled:text-gray-600 hover:text-blue-400 p-1 rounded-full transition-colors"
            title="Send"
          >
            <Send size={18} />
          </button>
        </div>
      </form>
    </aside>
  );
};

