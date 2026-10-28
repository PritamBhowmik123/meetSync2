/**
 * Intelligent Meeting Summarizer & Transcript Analyzer
 * Processes real-time meeting captions and chat to extract structured summaries,
 * key discussion points, action items, and speaker breakdown.
 */

export const generateMeetingSummary = ({
  transcript = [],
  chatMessages = [],
  roomId = '',
  title = '',
  duration = '0m'
}) => {
  // 1. Merge and clean lines
  const allLines = [];

  // Add captions transcript
  transcript.forEach((item) => {
    if (item.text && item.text.trim()) {
      allLines.push({
        sender: item.senderName || 'Participant',
        text: item.text.trim(),
        time: item.time || '00:00',
        type: 'speech'
      });
    }
  });

  // Add relevant chat messages
  chatMessages.forEach((msg) => {
    if (msg.message && msg.message.trim()) {
      allLines.push({
        sender: msg.senderName || 'Participant',
        text: msg.message.trim(),
        time: msg.timestamp || '00:00',
        type: 'chat'
      });
    }
  });

  if (allLines.length === 0) {
    return {
      title: title || `Meeting ${roomId}`,
      overview: 'No speech or chat activity was recorded during this session. Turn on Live Captions (CC) or speak into your microphone to generate automated meeting summaries.',
      keyPoints: [
        'Session concluded without active transcription recordings.',
        'Use the "Turn on captions" (CC) button during meetings to capture speech in real-time.'
      ],
      actionItems: [],
      speakers: [],
      totalLines: 0,
      wordCount: 0,
      duration
    };
  }

  // 2. Compute Speaker Breakdown & Word Count
  const speakerStats = {};
  let totalWords = 0;

  allLines.forEach((line) => {
    const words = line.text.split(/\s+/).filter(Boolean).length;
    totalWords += words;
    speakerStats[line.sender] = (speakerStats[line.sender] || 0) + 1;
  });

  const speakers = Object.entries(speakerStats).map(([name, count]) => ({
    name,
    contributions: count,
    percentage: Math.round((count / allLines.length) * 100)
  }));

  // 3. Extract Action Items
  const actionTriggers = [
    /\b(?:will|need to|needs to|action item|action|task|make sure to|remember to|due|deadline|follow up|assign|submit|prepare|review|homework)\b/i,
    /\b(?:i'll|we'll|let's|please make sure|by next|by tomorrow|by friday|by monday)\b/i
  ];

  const extractedActions = [];
  allLines.forEach((line) => {
    const isAction = actionTriggers.some((rgx) => rgx.test(line.text));
    if (isAction) {
      // Clean up punctuation
      const cleaned = line.text.charAt(0).toUpperCase() + line.text.slice(1);
      extractedActions.push({
        task: cleaned,
        assignee: line.sender,
        time: line.time
      });
    }
  });

  // 4. Extract Key Discussion Points
  const keyTriggers = [
    /\b(?:discuss|decided|concluded|agreed|important|key point|conclusion|solution|problem|goal|agenda|topic|update|learn|understand)\b/i,
    /\?$/
  ];

  const extractedKeyPoints = [];
  allLines.forEach((line) => {
    const isKey = keyTriggers.some((rgx) => rgx.test(line.text));
    if (isKey && line.text.length > 15) {
      extractedKeyPoints.push(`${line.sender}: "${line.text}"`);
    }
  });

  // Fallback if no specific trigger matched but text exists
  if (extractedKeyPoints.length === 0 && allLines.length > 0) {
    allLines.slice(0, 4).forEach((l) => {
      extractedKeyPoints.push(`${l.sender} discussed: ${l.text}`);
    });
  }

  // Default actions if none found
  const finalActionItems = extractedActions.length > 0
    ? extractedActions.slice(0, 8)
    : [
        {
          task: 'Review meeting notes and shared conference links.',
          assignee: 'All Participants',
          time: 'Post-meeting'
        }
      ];

  // 5. Synthesize Executive Overview
  const speakerNames = Object.keys(speakerStats).join(', ');
  const overview = `The meeting "${title || roomId}" concluded with ${speakers.length} active speaker(s) (${speakerNames}). A total of ${allLines.length} statements and approximately ${totalWords} words were recorded during this session. Key discussions centered on the topics reviewed above, and action items were assigned for subsequent follow-up.`;

  return {
    title: title || `Meeting ${roomId}`,
    overview,
    keyPoints: extractedKeyPoints.slice(0, 6),
    actionItems: finalActionItems,
    speakers,
    totalLines: allLines.length,
    wordCount: totalWords,
    duration
  };
};
