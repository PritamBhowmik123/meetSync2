import React, { useState, useEffect } from 'react';
import { AuthModal } from './components/AuthModal';
import { Lobby } from './components/Lobby';
import { MeetingRoom } from './components/MeetingRoom';
import { authService } from './services/auth';

export function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [meetingConfig, setMeetingConfig] = useState(null);
  const [initialRoomId, setInitialRoomId] = useState('');

  // Check URL query params on load (e.g. ?room=xyz-abc-def)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      setInitialRoomId(roomParam);
    }
  }, []);

  // Validate stored session on load
  useEffect(() => {
    const initAuth = async () => {
      try {
        const user = await authService.getMe();
        if (user) {
          setCurrentUser(user);
        }
      } catch (err) {
        console.warn('Session verification failed:', err);
      } finally {
        setAuthChecking(false);
      }
    };

    initAuth();
  }, []);

  const handleAuthSuccess = (user) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
    authService.logout();
    setCurrentUser(null);
    setMeetingConfig(null);
  };

  const handleJoinMeeting = ({ roomId, userName, isVideoOn, isAudioOn }) => {
    // Reflect room in URL query parameter without full reload
    const url = new URL(window.location.href);
    url.searchParams.set('room', roomId);
    window.history.pushState({}, '', url.toString());

    setMeetingConfig({
      roomId,
      userName,
      isVideoOn,
      isAudioOn
    });
  };

  const handleLeaveMeeting = () => {
    // Clear room from URL
    const url = new URL(window.location.href);
    url.searchParams.delete('room');
    window.history.pushState({}, '', url.pathname);

    setMeetingConfig(null);
  };

  // Loading spinner while verifying existing token
  if (authChecking) {
    return (
      <div className="h-screen w-screen bg-[#202124] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Authentication barrier: user must sign in or create an account
  if (!currentUser) {
    return <AuthModal onAuthSuccess={handleAuthSuccess} />;
  }

  // Inside active meeting room
  if (meetingConfig) {
    return (
      <MeetingRoom
        roomId={meetingConfig.roomId}
        userName={meetingConfig.userName}
        initialVideo={meetingConfig.isVideoOn}
        initialAudio={meetingConfig.isAudioOn}
        onLeave={handleLeaveMeeting}
      />
    );
  }

  // Pre-meeting Lobby
  return (
    <Lobby
      currentUser={currentUser}
      onLogout={handleLogout}
      onJoinMeeting={handleJoinMeeting}
      initialRoomId={initialRoomId}
    />
  );
}

export default App;
