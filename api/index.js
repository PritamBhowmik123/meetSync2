import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

import { initDb } from '../backend/src/db.js';
import authRouter from '../backend/src/routes/auth.js';
import meetingsRouter from '../backend/src/routes/meetings.js';

const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

app.use(express.json());

// Initialize Neon database schema
initDb();

// Mount routes
app.use('/api/auth', authRouter);
app.use('/api/meetings', meetingsRouter);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    database: 'Neon PostgreSQL (Serverless Vercel)',
    timestamp: new Date().toISOString()
  });
});

export default app;
