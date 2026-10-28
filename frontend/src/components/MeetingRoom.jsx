import React, { useState, useEffect } from 'react';
import { useWebRTC } from '../hooks/useWebRTC';
import { VideoTile } from './VideoTile';
import { ControlsBar } from './ControlsBar';
import { ChatDrawer } from './ChatDrawer';
import { ParticipantsDrawer } from './ParticipantsDrawer';
import { MeetingInfoDrawer } from './MeetingInfoDrawer';
import { socket } from '../services/socket';

export const MeetingRoom = ({
  roomId,
  userName,
  initialVideo = true,
  initialAudio = true,
  onLeave
}) => {
  const {
    localStream,
    isVideoOn,
    isAudioOn,
    remoteParticipants,
    messages,
    error,
    toggleVideo,
    toggleAudio,
    sendChatMessage
  } = useWebRTC(roomId, userName, initialVideo, initialAudio);

  const [activeSidebar, setActiveSidebar] = useState(null); // 'chat' | 'participants' | 'info' | null
  const [unreadCount, setUnreadCount] = useState(0);
  const [toastMessage, setToastMessage] = useState(null);

  // Clear unread count when chat opens
  useEffect(() => {
    if (activeSidebar === 'chat') {
      setUnreadCount(0);
    }
  }, [activeSidebar]);

  // Track new messages for unread badge
  useEffect(() => {
    if (messages.length > 0 && activeSidebar !== 'chat') {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.senderSocketId !== socket.id) {
        setUnreadCount((prev) => prev + 1);
      }
    }
  }, [messages, activeSidebar]);

  // User join/leave toast notifications
  useEffect(() => {
    const handleUserJoined = (user) => {
      showToast(`${user.userName} joined the meeting`);
    };
    const handleUserLeft = (user) => {
      showToast(`${user.userName} left the meeting`);
    };

    socket.on('user-joined', handleUserJoined);
    socket.on('user-left', handleUserLeft);

    return () => {
      socket.off('user-joined', handleUserJoined);
      socket.off('user-left', handleUserLeft);
    };
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const remoteList = Object.entries(remoteParticipants);
  const totalCount = 1 + remoteList.length;

  // Responsive Grid Class calculation
  const getGridClass = () => {
    if (totalCount === 1) return 'grid-cols-1 max-w-4xl max-h-[80vh]';
    if (totalCount === 2) return 'grid-cols-1 md:grid-cols-2 max-w-6xl max-h-[82vh]';
    if (totalCount <= 4) return 'grid-cols-1 sm:grid-cols-2 max-w-6xl max-h-[85vh]';
    if (totalCount <= 6) return 'grid-cols-2 md:grid-cols-3 max-w-7xl max-h-[85vh]';
    return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 max-w-7xl max-h-[88vh]';
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#202124] overflow-hidden">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 bg-[#3c4043]/90 text-white text-sm font-medium px-4 py-2.5 rounded-full shadow-2xl backdrop-blur-md border border-[#5f6368] transition-all animate-bounce">
          {toastMessage}
        </div>
      )}

      {/* Main Container: Video Canvas + Optional Sidebar */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Video Canvas */}
        <main className="flex-1 p-3 sm:p-4 md:p-6 flex items-center justify-center overflow-hidden">
          <div className={`grid gap-3 sm:gap-4 w-full h-full items-center justify-center ${getGridClass()}`}>
            {/* Local Video Tile */}
            <div className="w-full h-full min-h-[160px] flex items-center justify-center">
              <VideoTile
                stream={localStream}
                userName={userName}
                isVideoOn={isVideoOn}
                isAudioOn={isAudioOn}
                isLocal={true}
              />
            </div>

            {/* Remote Video Tiles */}
            {remoteList.map(([peerSocketId, participant]) => (
              <div key={peerSocketId} className="w-full h-full min-h-[160px] flex items-center justify-center">
                <VideoTile
                  stream={participant.stream}
                  userName={participant.userName}
                  isVideoOn={participant.isVideoOn}
                  isAudioOn={participant.isAudioOn}
                  isLocal={false}
                />
              </div>
            ))}
          </div>
        </main>

        {/* Sidebars */}
        {activeSidebar === 'chat' && (
          <ChatDrawer
            messages={messages}
            onSendMessage={sendChatMessage}
            onClose={() => setActiveSidebar(null)}
            currentSocketId={socket.id}
          />
        )}

        {activeSidebar === 'participants' && (
          <ParticipantsDrawer
            onClose={() => setActiveSidebar(null)}
            userName={userName}
            isAudioOn={isAudioOn}
            isVideoOn={isVideoOn}
            remoteParticipants={remoteParticipants}
          />
        )}

        {activeSidebar === 'info' && (
          <MeetingInfoDrawer
            roomId={roomId}
            onClose={() => setActiveSidebar(null)}
          />
        )}
      </div>

      {/* Floating Bottom Controls */}
      <ControlsBar
        roomId={roomId}
        isVideoOn={isVideoOn}
        isAudioOn={isAudioOn}
        toggleVideo={toggleVideo}
        toggleAudio={toggleAudio}
        onLeaveMeeting={onLeave}
        activeSidebar={activeSidebar}
        setActiveSidebar={setActiveSidebar}
        participantsCount={totalCount}
        unreadCount={unreadCount}
      />
    </div>
  );
};

