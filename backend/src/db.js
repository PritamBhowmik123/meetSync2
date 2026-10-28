import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure env variables are loaded regardless of import order
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config();

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('[Neon DB] CRITICAL: DATABASE_URL is not set in environment!');
}

export const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

// Auto-initialize schema on server boot
export const initDb = async () => {
  try {
    const client = await pool.connect();
    console.log('[Neon DB] Connected successfully to Neon PostgreSQL database.');

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS meetings (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        code VARCHAR(32) NOT NULL,
        host_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        host_name TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS meeting_summaries (
        id SERIAL PRIMARY KEY,
        meeting_code VARCHAR(32) NOT NULL,
        title TEXT,
        overview TEXT,
        key_points JSONB DEFAULT '[]',
        action_items JSONB DEFAULT '[]',
        transcript JSONB DEFAULT '[]',
        duration TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    client.release();
    console.log('[Neon DB] Users, Meetings, and Summaries tables verified/ready.');
  } catch (err) {
    console.error('[Neon DB] Initialization error:', err.message);
  }
};

// Database operations
export const db = {
  // Find user by email
  async findUserByEmail(email) {
    const res = await pool.query(
      'SELECT id, name, email, password_hash, created_at FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1',
      [email.trim()]
    );
    return res.rows[0] || null;
  },

  // Find user by ID
  async findUserById(id) {
    const res = await pool.query(
      'SELECT id, name, email, created_at FROM users WHERE id = $1 LIMIT 1',
      [id]
    );
    return res.rows[0] || null;
  },

  // Create new user
  async createUser({ name, email, passwordHash }) {
    const res = await pool.query(
      'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email, created_at',
      [name.trim(), email.trim().toLowerCase(), passwordHash]
    );
    return res.rows[0];
  },

  // Create new meeting
  async createMeeting({ title, code, hostId, hostName }) {
    const res = await pool.query(
      'INSERT INTO meetings (title, code, host_id, host_name) VALUES ($1, $2, $3, $4) RETURNING *',
      [title.trim(), code.trim().toLowerCase(), hostId || null, hostName || null]
    );
    return res.rows[0];
  },

  // Get meetings for user or all recent meetings
  async getMeetings(userId) {
    const res = await pool.query(
      'SELECT id, title, code, host_id, host_name, created_at FROM meetings ORDER BY created_at DESC LIMIT 50'
    );
    return res.rows;
  },

  // Find meeting by room code
  async findMeetingByCode(code) {
    const res = await pool.query(
      'SELECT * FROM meetings WHERE LOWER(code) = LOWER($1) ORDER BY created_at DESC LIMIT 1',
      [code.trim()]
    );
    return res.rows[0] || null;
  },

  // Save meeting summary and transcript into Neon DB
  async saveMeetingSummary({ meetingCode, title, overview, keyPoints, actionItems, transcript, duration }) {
    const res = await pool.query(
      `INSERT INTO meeting_summaries (meeting_code, title, overview, key_points, action_items, transcript, duration)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        meetingCode.trim().toLowerCase(),
        title || 'Meeting Summary',
        overview || '',
        JSON.stringify(keyPoints || []),
        JSON.stringify(actionItems || []),
        JSON.stringify(transcript || []),
        duration || '0m'
      ]
    );
    return res.rows[0];
  },

  // Retrieve saved summary by meeting code
  async getMeetingSummary(meetingCode) {
    const res = await pool.query(
      `SELECT * FROM meeting_summaries WHERE LOWER(meeting_code) = LOWER($1) ORDER BY created_at DESC LIMIT 1`,
      [meetingCode.trim()]
    );
    return res.rows[0] || null;
  }
};
