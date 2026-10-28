import { useState, useEffect, useRef, useCallback } from 'react';
import { socket } from '../services/socket';

const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' }
  ]
};

export const useWebRTC = (roomId, userName, initialVideo = true, initialAudio = true) => {
  const [localStream, setLocalStream] = useState(null);
  const [isVideoOn, setIsVideoOn] = useState(initialVideo);
  const [isAudioOn, setIsAudioOn] = useState(initialAudio);
  const [remoteParticipants, setRemoteParticipants] = useState({});
  const [messages, setMessages] = useState([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);

  // References to preserve state across callbacks
  const localStreamRef = useRef(null);
  const peersRef = useRef(new Map()); // socketId -> RTCPeerConnection
  const iceCandidatesQueue = useRef(new Map()); // socketId -> RTCIceCandidateInit[]

  // Safely drain queued ICE candidates once remote description is set
  const processCandidateQueue = async (socketId, pc) => {
    const queue = iceCandidatesQueue.current.get(socketId) || [];
    while (queue.length > 0) {
      const candidate = queue.shift();
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.warn(`[WebRTC] Error adding queued ICE candidate for ${socketId}:`, err);
      }
    }
    iceCandidatesQueue.current.delete(socketId);
  };

  // Create an RTCPeerConnection instance for a target socket
  const createPeerConnection = useCallback((targetSocketId, targetUserName, isTargetVideoOn = true, isTargetAudioOn = true) => {
    if (peersRef.current.has(targetSocketId)) {
      return peersRef.current.get(targetSocketId);
    }

    const pc = new RTCPeerConnection(RTC_CONFIG);
    peersRef.current.set(targetSocketId, pc);

    // Add local tracks to peer connection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    // Handle ICE Candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('ice-candidate', {
          targetSocketId,
          candidate: event.candidate
        });
      }
    };

    // Handle Remote Track
    pc.ontrack = (event) => {
      const remoteMediaStream = event.streams[0];
      setRemoteParticipants((prev) => ({
        ...prev,
        [targetSocketId]: {
          ...(prev[targetSocketId] || {
            userName: targetUserName,
            isVideoOn: isTargetVideoOn,
            isAudioOn: isTargetAudioOn
          }),
          stream: remoteMediaStream
        }
      }));
    };

    // Connection state changes
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        removePeer(targetSocketId);
      }
    };

    return pc;
  }, []);

  // Remove a peer cleanly
  const removePeer = useCallback((socketId) => {
    if (peersRef.current.has(socketId)) {
      const pc = peersRef.current.get(socketId);
      pc.close();
      peersRef.current.delete(socketId);
    }
    iceCandidatesQueue.current.delete(socketId);
    setRemoteParticipants((prev) => {
      const updated = { ...prev };
      delete updated[socketId];
      return updated;
    });
  }, []);

  // Initialize Media and connect
  useEffect(() => {
    let isMounted = true;

    const setupMediaAndSocket = async () => {
      try {
        let stream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              facingMode: 'user'
            },
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true
            }
          });
        } catch (mediaErr) {
          console.warn('[WebRTC] Could not get audio and video, trying audio only:', mediaErr);
          try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          } catch (audioErr) {
            console.warn('[WebRTC] Could not get audio device, proceeding with empty stream:', audioErr);
            stream = new MediaStream();
          }
        }

        if (!isMounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        localStreamRef.current = stream;
        setLocalStream(stream);

        // Apply initial toggle states to the tracks
        stream.getVideoTracks().forEach((track) => {
          track.enabled = initialVideo;
        });
        stream.getAudioTracks().forEach((track) => {
          track.enabled = initialAudio;
        });

        // Connect socket if not already connected
        if (!socket.connected) {
          socket.connect();
        }

        // Join Meeting
        socket.emit('join-meeting', {
          roomId,
          userName,
          isVideoOn: initialVideo,
          isAudioOn: initialAudio
        });

        setConnected(true);
      } catch (err) {
        console.error('[WebRTC] Initialization error:', err);
        if (isMounted) setError(err.message || 'Failed to initialize devices');
      }
    };

    setupMediaAndSocket();

    // Socket Event Listeners
    // 1. Current user joined - gets list of existing peers to initiate offers to
    const handleMeetingJoined = async ({ participants }) => {
      for (const participant of participants) {
        const targetId = participant.socketId;
        // Register initial state for participant
        setRemoteParticipants((prev) => ({
          ...prev,
          [targetId]: {
            userName: participant.userName,
            isVideoOn: participant.isVideoOn,
            isAudioOn: participant.isAudioOn,
            stream: null
          }
        }));

        const pc = createPeerConnection(targetId, participant.userName, participant.isVideoOn, participant.isAudioOn);

        try {
          const offer = await pc.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true
          });
          await pc.setLocalDescription(offer);

          socket.emit('signal-offer', {
            targetSocketId: targetId,
            offer
          });
        } catch (offerErr) {
          console.error(`[WebRTC] Failed to create offer for ${targetId}:`, offerErr);
        }
      }
    };

    // 2. Another user joined room
    const handleUserJoined = (participant) => {
      setRemoteParticipants((prev) => ({
        ...prev,
        [participant.socketId]: {
          userName: participant.userName,
          isVideoOn: participant.isVideoOn,
          isAudioOn: participant.isAudioOn,
          stream: null
        }
      }));
    };

    // 3. Received Offer from a peer
    const handleSignalOffer = async ({ callerSocketId, offer }) => {
      let pc = peersRef.current.get(callerSocketId);
      if (!pc) {
        pc = createPeerConnection(callerSocketId, 'Participant');
      }

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        await processCandidateQueue(callerSocketId, pc);

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit('signal-answer', {
          targetSocketId: callerSocketId,
          answer
        });
      } catch (err) {
        console.error(`[WebRTC] Error handling signal offer from ${callerSocketId}:`, err);
      }
    };

    // 4. Received Answer from peer
    const handleSignalAnswer = async ({ responderSocketId, answer }) => {
      const pc = peersRef.current.get(responderSocketId);
      if (pc) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
          await processCandidateQueue(responderSocketId, pc);
        } catch (err) {
          console.error(`[WebRTC] Error handling answer from ${responderSocketId}:`, err);
        }
      }
    };

    // 5. Received ICE Candidate from peer
    const handleIceCandidate = async ({ senderSocketId, candidate }) => {
      const pc = peersRef.current.get(senderSocketId);
      if (pc && pc.remoteDescription && pc.remoteDescription.type) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.warn(`[WebRTC] Error adding ICE candidate from ${senderSocketId}:`, err);
        }
      } else {
        // Queue candidate until remote description is set
        if (!iceCandidatesQueue.current.has(senderSocketId)) {
          iceCandidatesQueue.current.set(senderSocketId, []);
        }
        iceCandidatesQueue.current.get(senderSocketId).push(candidate);
      }
    };

    // 6. Remote video status toggle
    const handleUserVideoToggled = ({ socketId, isVideoOn: state }) => {
      setRemoteParticipants((prev) => {
        if (!prev[socketId]) return prev;
        return {
          ...prev,
          [socketId]: {
            ...prev[socketId],
            isVideoOn: state
          }
        };
      });
    };

    // 7. Remote audio status toggle
    const handleUserAudioToggled = ({ socketId, isAudioOn: state }) => {
      setRemoteParticipants((prev) => {
        if (!prev[socketId]) return prev;
        return {
          ...prev,
          [socketId]: {
            ...prev[socketId],
            isAudioOn: state
          }
        };
      });
    };

    // 8. Remote user left
    const handleUserLeft = ({ socketId }) => {
      removePeer(socketId);
    };

    // 9. In-call chat message
    const handleNewChatMessage = (msg) => {
      setMessages((prev) => [...prev, msg]);
    };

    socket.on('meeting-joined', handleMeetingJoined);
    socket.on('user-joined', handleUserJoined);
    socket.on('signal-offer', handleSignalOffer);
    socket.on('signal-answer', handleSignalAnswer);
    socket.on('ice-candidate', handleIceCandidate);
    socket.on('user-video-toggled', handleUserVideoToggled);
    socket.on('user-audio-toggled', handleUserAudioToggled);
    socket.on('user-left', handleUserLeft);
    socket.on('new-chat-message', handleNewChatMessage);

    return () => {
      isMounted = false;
      // Clean up socket listeners
      socket.off('meeting-joined', handleMeetingJoined);
      socket.off('user-joined', handleUserJoined);
      socket.off('signal-offer', handleSignalOffer);
      socket.off('signal-answer', handleSignalAnswer);
      socket.off('ice-candidate', handleIceCandidate);
      socket.off('user-video-toggled', handleUserVideoToggled);
      socket.off('user-audio-toggled', handleUserAudioToggled);
      socket.off('user-left', handleUserLeft);
      socket.off('new-chat-message', handleNewChatMessage);

      // Stop local tracks
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;
      }

      // Close all peer connections
      peersRef.current.forEach((pc) => pc.close());
      peersRef.current.clear();
      iceCandidatesQueue.current.clear();

      // Emit leave
      socket.emit('leave-meeting');
    };
  }, [roomId, userName, initialVideo, initialAudio, createPeerConnection, removePeer]);

  // Toggle Video
  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks();
      if (videoTracks.length > 0) {
        const nextState = !isVideoOn;
        videoTracks.forEach((track) => {
          track.enabled = nextState;
        });
        setIsVideoOn(nextState);
        socket.emit('toggle-video', { isVideoOn: nextState });
      }
    }
  }, [isVideoOn]);

  // Toggle Audio
  const toggleAudio = useCallback(() => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      if (audioTracks.length > 0) {
        const nextState = !isAudioOn;
        audioTracks.forEach((track) => {
          track.enabled = nextState;
        });
        setIsAudioOn(nextState);
        socket.emit('toggle-audio', { isAudioOn: nextState });
      }
    }
  }, [isAudioOn]);

  // Send Chat Message
  const sendChatMessage = useCallback((messageText) => {
    if (!messageText || !messageText.trim()) return;
    socket.emit('send-chat-message', { message: messageText.trim() });
  }, []);

  return {
    localStream,
    isVideoOn,
    isAudioOn,
    remoteParticipants,
    messages,
    connected,
    error,
    toggleVideo,
    toggleAudio,
    sendChatMessage
  };
};

