const SERVER_URL = import.meta.env.VITE_SERVER_URL || 
  (typeof window !== 'undefined' && window.location.port === '5173' ? 'http://localhost:5000' : '');

const API_BASE = `${SERVER_URL}/api`;

export const authService = {
  getToken() {
    return localStorage.getItem('meetsync_token');
  },

  setToken(token) {
    if (token) {
      localStorage.setItem('meetsync_token', token);
    } else {
      localStorage.removeItem('meetsync_token');
    }
  },

  async signup(name, email, password) {
    const res = await fetch(`${API_BASE}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to sign up');
    }
    if (data.token) {
      this.setToken(data.token);
    }
    return data;
  },

  async login(email, password) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to log in');
    }
    if (data.token) {
      this.setToken(data.token);
    }
    return data;
  },

  async getMe() {
    const token = this.getToken();
    if (!token) return null;

    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) {
        this.logout();
        return null;
      }
      const data = await res.json();
      return data.user;
    } catch {
      return null;
    }
  },

  logout() {
    this.setToken(null);
  },

  async recordMeeting(title, code) {
    const token = this.getToken();
    if (!token) return null;
    try {
      const res = await fetch(`${API_BASE}/meetings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ title, code })
      });
      return await res.json();
    } catch (err) {
      console.warn('Failed to record meeting:', err);
      return null;
    }
  },

  async getMeetings() {
    const token = this.getToken();
    if (!token) return [];
    try {
      const res = await fetch(`${API_BASE}/meetings`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        return data.meetings || [];
      }
      return [];
    } catch (err) {
      console.warn('Failed to load meetings:', err);
      return [];
    }
  }
};
