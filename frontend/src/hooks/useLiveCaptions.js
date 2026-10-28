import { useState, useEffect, useRef, useCallback } from 'react';
import { socket } from '../services/socket';

export const useLiveCaptions = (userName, isAudioOn) => {
  const [isCaptionsOn, setIsCaptionsOn] = useState(false);
  const [activeCaption, setActiveCaption] = useState(null);
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

          // Update local view
          setActiveCaption(captionData);
          scheduleCaptionClear();

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
  }, [language, userName, scheduleCaptionClear]);

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
      // Only display captions if local user has captions turned on
      if (isCaptionsOnRef.current) {
        setActiveCaption({
          ...captionData,
          isMe: false
        });
        scheduleCaptionClear();
      }
    };

    socket.on('new-caption', handleNewCaption);

    return () => {
      socket.off('new-caption', handleNewCaption);
    };
  }, [scheduleCaptionClear]);

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
    isSupported,
    language,
    setLanguage,
    toggleCaptions
  };
};
