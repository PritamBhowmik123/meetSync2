import express from 'express';
import { db } from '../db.js';
import { verifyAuth } from '../middleware/auth.js';

const router = express.Router();

// POST /api/meetings — Create/save a new meeting directly into Neon DB
router.post('/', verifyAuth, async (req, res) => {
  const { title, code } = req.body;
  if (!code) {
    return res.status(400).json({ error: 'Meeting code is required.' });
  }

  try {
    const meeting = await db.createMeeting({
      title: title || 'Quick Meeting',
      code,
      hostId: req.user.id,
      hostName: req.user.name
    });

    res.status(201).json({
      message: 'Meeting stored successfully in Neon DB',
      meeting
    });
  } catch (err) {
    console.error('[Meetings] Create error:', err);
    res.status(500).json({ error: 'Failed to record meeting in Neon DB.' });
  }
});

// GET /api/meetings — List meetings stored in Neon DB
router.get('/', verifyAuth, async (req, res) => {
  try {
    const meetings = await db.getMeetings(req.user.id);
    res.json({ meetings });
  } catch (err) {
    console.error('[Meetings] List error:', err);
    res.status(500).json({ error: 'Failed to load meetings from Neon DB.' });
  }
});

// GET /api/meetings/validate/:code — Validate meeting code
router.get('/validate/:code', verifyAuth, async (req, res) => {
  try {
    const meeting = await db.findMeetingByCode(req.params.code);
    res.json({
      valid: true,
      meeting: meeting || { code: req.params.code }
    });
  } catch (err) {
    res.status(500).json({ error: 'Error validating meeting code.' });
  }
});

// POST /api/meetings/summary — Save meeting summary and transcript into Neon DB
router.post('/summary', verifyAuth, async (req, res) => {
  const { meetingCode, title, overview, keyPoints, actionItems, transcript, duration } = req.body;
  if (!meetingCode) {
    return res.status(400).json({ error: 'Meeting code is required.' });
  }

  try {
    const summary = await db.saveMeetingSummary({
      meetingCode,
      title,
      overview,
      keyPoints,
      actionItems,
      transcript,
      duration
    });

    res.status(201).json({
      message: 'Summary saved in Neon DB successfully',
      summary
    });
  } catch (err) {
    console.error('[Meetings] Save summary error:', err);
    res.status(500).json({ error: 'Failed to save meeting summary in Neon DB.' });
  }
});

// GET /api/meetings/summary/:code — Get saved summary by meeting code
router.get('/summary/:code', verifyAuth, async (req, res) => {
  try {
    const summary = await db.getMeetingSummary(req.params.code);
    if (!summary) {
      return res.status(404).json({ error: 'Summary not found for this meeting.' });
    }
    res.json({ summary });
  } catch (err) {
    console.error('[Meetings] Get summary error:', err);
    res.status(500).json({ error: 'Failed to fetch meeting summary.' });
  }
});

export default router;
