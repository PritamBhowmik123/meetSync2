import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

import { initDb } from '../backend/src/db.js';
import authRouter from '../backend/src/routes/auth.js';
import meetingsRouter from '../backend/src/routes/meetings.js';
import faceRouter from '../backend/src/routes/face.js';

const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ limit: '25mb', extended: true }));

// Initialize Neon database schema
initDb();

// Mount routes
app.use('/api/auth', authRouter);
app.use('/api/meetings', meetingsRouter);
app.use('/api/face', faceRouter);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    database: 'Neon PostgreSQL (Serverless Vercel)',
    faceNet: 'FaceNet 512D Biometrics',
    timestamp: new Date().toISOString()
  });
});

export default app;
