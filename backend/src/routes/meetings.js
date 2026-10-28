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

export default router;
