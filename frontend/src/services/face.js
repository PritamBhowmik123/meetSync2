import { authService } from './auth';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 
  (typeof window !== 'undefined' && window.location.port === '5173' ? 'http://localhost:5000' : '');

const API_BASE = `${SERVER_URL}/api/face`;

export const faceService = {
  /**
   * Enroll up to 5 face photos in Neon DB using FaceNet (512D)
   * @param {string[]} photos - Array of base64 data URLs
   */
  async enrollFaces(photos) {
    const token = authService.getToken();
    if (!token) throw new Error('You must be signed in to enroll face data.');

    const res = await fetch(`${API_BASE}/enroll`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ photos })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to enroll face embeddings.');
    }
    return data;
  },

  /**
   * Get current user's FaceNet enrollment status & photos from Neon DB
   */
  async getStatus() {
    const token = authService.getToken();
    if (!token) return { enrolled: false, photoCount: 0, photos: [] };

    try {
      const res = await fetch(`${API_BASE}/status`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) {
        return { enrolled: false, photoCount: 0, photos: [] };
      }
      return await res.json();
    } catch (err) {
      console.warn('Failed to fetch face enrollment status:', err);
      return { enrolled: false, photoCount: 0, photos: [] };
    }
  },

  /**
   * Test / Verify a photo (webcam snapshot or upload) against logged-in user's enrolled FaceNet embedding
   * @param {string} image - Base64 data URL
   */
  async verifyFace(image) {
    const token = authService.getToken();
    if (!token) throw new Error('You must be signed in to verify your face.');

    const res = await fetch(`${API_BASE}/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ image })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Face verification failed.');
    }
    return data;
  },

  /**
   * Identify a face against ALL enrolled users in Neon DB
   * @param {string} image - Base64 data URL
   */
  async identifyFace(image) {
    const res = await fetch(`${API_BASE}/identify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ image })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Face identification failed.');
    }
    return data;
  },

  /**
   * Delete current user's face enrollment from Neon DB
   */
  async deleteEnrollment() {
    const token = authService.getToken();
    if (!token) throw new Error('You must be signed in.');

    const res = await fetch(`${API_BASE}/enrollment`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to delete face enrollment.');
    }
    return data;
  }
};
