import { useState, useEffect, useRef, useCallback } from 'react';
import { socket } from '../services/socket';

export const useLiveCaptions = (userName, isAudioOn) => {
  const [isCaptionsOn, setIsCaptionsOn] = useState(false);
  const [activeCaption, setActiveCaption] = useState(null);
  const [meetingTranscript, setMeetingTranscript] = useState([]);
  const [language, setLanguage] = useState('en-US');
  const [isSupported, setIsSupported] = useState(true);

  const recognitionRef = useRef(null);
  const isCaptionsOnRef = useRef(isCaptionsOn);
  const isAudioOnRef = useRef(isAudioOn);
  const clearTimerRef = useRef(null);
  const shouldRestartRef = useRef(true);

  // Keep refs up-to-date with current state to avoid stale closures in callbacks
  useEffect(() => {
    isCaptionsOnRef.current = isCaptionsOn;
  }, [isCaptionsOn]);

  useEffect(() => {
    isAudioOnRef.current = isAudioOn;
  }, [isAudioOn]);

  // Check browser support
  useEffect(() => {
    const SpeechRecognition = typeof window !== 'undefined'
      ? (window.SpeechRecognition || window.webkitSpeechRecognition)
      : null;

    if (!SpeechRecognition) {
      setIsSupported(false);
    }
  }, []);

  // Helper to schedule auto-clearing captions after 5s of inactivity
  const scheduleCaptionClear = useCallback(() => {
    if (clearTimerRef.current) {
      clearTimeout(clearTimerRef.current);
    }
    clearTimerRef.current = setTimeout(() => {
      setActiveCaption(null);
    }, 5000);
  }, []);

  // Add a finalized entry to the meeting transcript
  const addTranscriptEntry = useCallback((senderName, text) => {
    if (!text || !text.trim()) return;
    const cleanText = text.trim();
    setMeetingTranscript((prev) => {
      // Prevent immediate identical duplicates
      if (prev.length > 0) {
        const last = prev[prev.length - 1];
        if (last.senderName === senderName && last.text === cleanText) {
          return prev;
        }
      }
      return [
        ...prev,
        {
          id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          senderName: senderName || 'Participant',
          text: cleanText,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          timestamp: Date.now()
        }
      ];
    });
  }, []);

  // Start speech recognition instance
  const startRecognition = useCallback(() => {
    const SpeechRecognition = typeof window !== 'undefined'
      ? (window.SpeechRecognition || window.webkitSpeechRecognition)
      : null;

    if (!SpeechRecognition) return;

    // Clean up any existing instance first
    if (recognitionRef.current) {
      try {
        shouldRestartRef.current = false;
        recognitionRef.current.abort();
      } catch {
        // ignore
      }
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = language;
      shouldRestartRef.current = true;

      recognition.onstart = () => {
        // Recognition started
      };

      recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        const currentText = finalTranscript || interimTranscript;
        const isFinal = Boolean(finalTranscript);

        if (currentText.trim()) {
          const captionData = {
            senderName: userName || 'You',
            isMe: true,
            text: currentText.trim(),
            isFinal,
            timestamp: Date.now()
          };

          // Update local live view
          setActiveCaption(captionData);
          scheduleCaptionClear();

          // Append to cumulative meeting transcript if final
          if (isFinal) {
            addTranscriptEntry(userName || 'You', currentText.trim());
          }

          // Broadcast to other participants
          socket.emit('send-caption', {
            text: currentText.trim(),
            isFinal
          });
        }
      };

      recognition.onerror = (event) => {
        // 'no-speech' is expected when participant is silent
        if (event.error !== 'no-speech' && event.error !== 'aborted') {
          console.warn('[Captions] Speech recognition error:', event.error);
        }
      };

      recognition.onend = () => {
        // Auto-restart if captions are active, audio is on, and shouldn't stop
        if (shouldRestartRef.current && isCaptionsOnRef.current && isAudioOnRef.current) {
          try {
            recognition.start();
          } catch (err) {
            console.warn('[Captions] Failed to restart recognition:', err);
          }
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.warn('[Captions] Error initializing speech recognition:', err);
    }
  }, [language, userName, scheduleCaptionClear, addTranscriptEntry]);

  // Stop speech recognition instance
  const stopRecognition = useCallback(() => {
    shouldRestartRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
  }, []);

  // React to captions toggle & microphone mute/unmute
  useEffect(() => {
    if (isCaptionsOn && isAudioOn) {
      startRecognition();
    } else {
      stopRecognition();
    }

    return () => {
      stopRecognition();
    };
  }, [isCaptionsOn, isAudioOn, startRecognition, stopRecognition]);

  // Listen for remote captions from peers
  useEffect(() => {
    const handleNewCaption = (captionData) => {
      // Only display live overlay if local user has captions turned on
      if (isCaptionsOnRef.current) {
        setActiveCaption({
          ...captionData,
          isMe: false
        });
        scheduleCaptionClear();
      }

      // Record in cumulative meeting transcript
      if (captionData.isFinal && captionData.text) {
        addTranscriptEntry(captionData.senderName, captionData.text);
      }
    };

    socket.on('new-caption', handleNewCaption);

    return () => {
      socket.off('new-caption', handleNewCaption);
    };
  }, [scheduleCaptionClear, addTranscriptEntry]);

  // Toggle captions on/off
  const toggleCaptions = useCallback(() => {
    setIsCaptionsOn((prev) => {
      const next = !prev;
      if (!next) {
        setActiveCaption(null);
      }
      return next;
    });
  }, []);

  return {
    isCaptionsOn,
    activeCaption,
    meetingTranscript,
    isSupported,
    language,
    setLanguage,
    toggleCaptions
  };
};
