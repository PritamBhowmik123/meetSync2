import express from 'express';
import { db } from '../db.js';
import { verifyAuth } from '../middleware/auth.js';
import { faceService } from '../services/faceService.js';

const router = express.Router();
const SIMILARITY_THRESHOLD = 0.65; // Cosine similarity threshold for FaceNet (512D)

// POST /api/face/enroll — Enroll up to 5 photos for the logged-in user
router.post('/enroll', verifyAuth, async (req, res) => {
  try {
    const { photos } = req.body;

    if (!Array.isArray(photos) || photos.length === 0) {
      return res.status(400).json({ error: 'Please provide between 1 and 5 photos for enrollment.' });
    }

    if (photos.length > 5) {
      return res.status(400).json({ error: 'A maximum of 5 photos can be enrolled.' });
    }

    console.log(`[FaceNet] Starting enrollment for User ID ${req.user.id} with ${photos.length} photo(s)...`);

    // Extract FaceNet embeddings using Python / ONNX engine
    const batchResult = await faceService.extractBatchEmbeddings(photos);

    if (!batchResult || !batchResult.embedding) {
      return res.status(400).json({ error: 'Could not extract valid FaceNet embeddings. Ensure your face is clearly visible and well-lit.' });
    }

    // Save into Neon DB face_embeddings table
    const record = await db.saveFaceEnrollment({
      userId: req.user.id,
      embedding: batchResult.embedding,
      embeddings: batchResult.individualEmbeddings,
      photos // base64 photos stored in Neon DB for visual verification
    });

    res.status(201).json({
      success: true,
      message: `Enrolled successfully with FaceNet (512D) using ${photos.length} photo(s).`,
      photoCount: photos.length,
      dimension: 512,
      updatedAt: record.updated_at
    });
  } catch (err) {
    console.error('[FaceNet] Enrollment error:', err);
    res.status(500).json({ error: err.message || 'Failed to complete FaceNet enrollment in Neon DB.' });
  }
});

// GET /api/face/status — Get enrollment status for current user
router.get('/status', verifyAuth, async (req, res) => {
  try {
    const enrollment = await db.getFaceEnrollment(req.user.id);
    if (!enrollment) {
      return res.json({
        enrolled: false,
        photoCount: 0,
        photos: []
      });
    }

    res.json({
      enrolled: true,
      photoCount: enrollment.photo_count || (enrollment.photos ? enrollment.photos.length : 1),
      photos: enrollment.photos || [],
      updatedAt: enrollment.updated_at
    });
  } catch (err) {
    console.error('[FaceNet] Status error:', err);
    res.status(500).json({ error: 'Failed to retrieve face enrollment status.' });
  }
});

// POST /api/face/verify — Test/verify a face against the logged-in user's enrolled FaceNet embeddings
router.post('/verify', verifyAuth, async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ error: 'An image (webcam capture or file upload) is required for verification.' });
    }

    // 1. Fetch user's enrolled embeddings from Neon DB
    const enrollment = await db.getFaceEnrollment(req.user.id);
    if (!enrollment || !enrollment.embedding) {
      return res.status(404).json({
        error: 'You have not enrolled your face yet. Please enroll your face first.'
      });
    }

    // 2. Extract FaceNet embedding from the incoming test image
    const testResult = await faceService.extractEmbedding(image);
    if (!testResult || !testResult.embedding) {
      return res.status(400).json({ error: 'Could not detect face in the provided test image.' });
    }

    const enrolledEmbedding = enrollment.embedding;
    const testEmbedding = testResult.embedding;

    // 3. Compute Cosine Similarity and Euclidean Distance
    const similarity = faceService.cosineSimilarity(testEmbedding, enrolledEmbedding);
    const distance = faceService.euclideanDistance(testEmbedding, enrolledEmbedding);

    // Also compare against individual photos if available for maximum match accuracy
    let bestSimilarity = similarity;
    if (Array.isArray(enrollment.embeddings) && enrollment.embeddings.length > 0) {
      for (const indVec of enrollment.embeddings) {
        const indSim = faceService.cosineSimilarity(testEmbedding, indVec);
        if (indSim > bestSimilarity) bestSimilarity = indSim;
      }
    }

    const matched = bestSimilarity >= SIMILARITY_THRESHOLD;
    const confidencePct = Math.min(99.9, Math.max(0, (bestSimilarity * 100))).toFixed(1);

    res.json({
      success: true,
      matched,
      similarity: parseFloat(bestSimilarity.toFixed(4)),
      confidence: `${confidencePct}%`,
      distance: parseFloat(distance.toFixed(4)),
      threshold: SIMILARITY_THRESHOLD,
      enrolledPhoto: (enrollment.photos && enrollment.photos.length > 0) ? enrollment.photos[0] : null,
      user: {
        id: enrollment.user_id,
        name: enrollment.user_name,
        email: enrollment.user_email
      }
    });
  } catch (err) {
    console.error('[FaceNet] Verification error:', err);
    res.status(500).json({ error: err.message || 'Face verification failed.' });
  }
});

// POST /api/face/identify — Identify matching user among ALL enrolled users in Neon DB
router.post('/identify', async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ error: 'Image is required for face identification.' });
    }

    const allEnrollments = await db.getAllFaceEnrollments();
    if (!allEnrollments || allEnrollments.length === 0) {
      return res.json({
        matched: false,
        message: 'No enrolled users found in Neon DB.'
      });
    }

    const testResult = await faceService.extractEmbedding(image);
    if (!testResult || !testResult.embedding) {
      return res.status(400).json({ error: 'Could not detect face in the test image.' });
    }

    let topMatch = null;
    let highestSim = -1;

    for (const enrollment of allEnrollments) {
      const sim = faceService.cosineSimilarity(testResult.embedding, enrollment.embedding);
      if (sim > highestSim) {
        highestSim = sim;
        topMatch = enrollment;
      }
    }

    if (highestSim >= SIMILARITY_THRESHOLD && topMatch) {
      res.json({
        matched: true,
        similarity: parseFloat(highestSim.toFixed(4)),
        confidence: `${(highestSim * 100).toFixed(1)}%`,
        user: {
          id: topMatch.user_id,
          name: topMatch.user_name,
          email: topMatch.user_email
        },
        enrolledPhoto: topMatch.photos?.[0] || null
      });
    } else {
      res.json({
        matched: false,
        similarity: parseFloat(highestSim.toFixed(4)),
        message: 'Face does not match any enrolled user in Neon DB.'
      });
    }
  } catch (err) {
    console.error('[FaceNet] Identify error:', err);
    res.status(500).json({ error: 'Face identification failed.' });
  }
});

// DELETE /api/face/enrollment — Remove user's face enrollment from Neon DB
router.delete('/enrollment', verifyAuth, async (req, res) => {
  try {
    const deleted = await db.deleteFaceEnrollment(req.user.id);
    res.json({
      success: true,
      message: deleted ? 'Face enrollment removed from Neon DB.' : 'No enrollment found to delete.'
    });
  } catch (err) {
    console.error('[FaceNet] Delete enrollment error:', err);
    res.status(500).json({ error: 'Failed to delete face enrollment.' });
  }
});

export default router;
