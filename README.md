# MeetSync 🎥

A lightweight, modern video meeting application built with **React (Frontend)** and **Node.js (Backend)** using native **WebRTC**, **Socket.IO**, and **Neon DB Storage**. Designed with a clean Google Meet-style interface, specifically tailored for hosting meetings, classes, and collaborative study groups.

---

## ✨ Features

- **Authentication Layer:**
  - Secure **Sign In** and **Sign Up** before entering the meeting lobby.
  - Password encryption via `bcryptjs` and session tokens via `jsonwebtoken` (JWT).
  - Displays user profile (Name, Email, Initials Avatar) and Sign Out button.
  - Stores user credentials and meeting records in Neon DB storage (`/neondb/rest/v1`).
  - **My Meetings** history drawer: View, select, and copy codes of stored past/scheduled meetings.
- **Pre-Meeting Lobby & Preview:**
  - Live preview card to test your camera and microphone before joining.
  - Enter your meeting display name.
  - Create an instant meeting with an auto-generated room code (e.g., `abc-defg-hij`).
  - Join any meeting using a room code or meeting link.
- **Audio & Video Streaming:**
  - Real-time peer-to-peer audio and video via WebRTC mesh and Google STUN servers.
  - Microphone toggle (Mute / Unmute).
  - Camera toggle (Turn Camera On / Off with avatar fallback).
- **In-Call Collaboration:**
  - Responsive video grid that dynamically scales for 1, 2, 4, 6, 8+ participants.
  - **Live Captions (Real-time Speech-to-Text):** Google Meet-style continuous live subtitles with speaker identification tags and keyboard shortcut (`c`).
  - In-call chat drawer with live messaging.
  - In-call participant drawer showing connected people and their mic/camera status.
  - Meeting details drawer with one-click copy for meeting codes and links.
  - Leave call button to safely end the session.

---

## 📁 Project Structure

```
MeetSync2/
├── backend/
│   ├── data/
│   │   └── db.json          # Persistent fallback storage
│   ├── src/
│   │   ├── middleware/
│   │   │   └── auth.js      # JWT verification middleware
│   │   ├── routes/
│   │   │   ├── auth.js      # Signup, login, & session endpoints (/api/auth)
│   │   │   └── meetings.js  # Store & retrieve meetings (/api/meetings)
│   │   ├── neonStorage.js   # Neon DB REST storage interface (/neondb/rest/v1)
│   │   └── server.js        # Express + Socket.IO signaling server
│   ├── .env
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AuthModal.jsx           # Sign in & Sign up modal
│   │   │   ├── Lobby.jsx               # Pre-call lobby with preview, profile & history
│   │   │   ├── MeetingRoom.jsx         # Main conference layout & state
│   │   │   ├── VideoTile.jsx           # Individual video card with avatar fallback
│   │   │   ├── ControlsBar.jsx         # Bottom toolbar (Mic, Cam, Leave, Drawers)
│   │   │   ├── ChatDrawer.jsx          # In-meeting text chat
│   │   │   ├── ParticipantsDrawer.jsx  # Participant list with status
│   │   │   └── MeetingInfoDrawer.jsx   # Shareable link & code copy modal
│   │   ├── hooks/
│   │   │   └── useWebRTC.js            # WebRTC RTCPeerConnection & media stream logic
│   │   ├── services/
│   │   │   ├── auth.js                 # Authentication & meetings API client
│   │   │   └── socket.js               # Socket.IO connection manager
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── vite.config.js
│   └── package.json
├── .env
├── package.json
└── README.md
```

---

## ⚙️ Neon DB Configuration

The backend is connected to the Neon Data API endpoint:
```env
NEON_REST_URL=https://ep-flat-butterfly-b4362xon.apirest.c-6.us-east-2.aws.neon.tech/neondb/rest/v1
```

If your Neon project uses a specific JWT token or API key for Data API access, you can provide it in `backend/.env` (or root `.env`):
```env
NEON_AUTH_TOKEN=your_neon_jwt_or_api_token
```

---

## 🚀 Getting Started

### 1. Run in Development Mode
```bash
npm run dev
```
- **Frontend App:** [http://localhost:5173](http://localhost:5173)
- **Backend API & Signaling:** [http://localhost:5000](http://localhost:5000)

### 2. Run in Production Mode
```bash
npm run build
npm start
```
Visit [http://localhost:5000](http://localhost:5000).

---

## 👥 How to Test Multi-User Calls

1. Open [http://localhost:5173](http://localhost:5173).
2. Create an account or sign in.
3. Click **"New meeting"** in the lobby.
4. Copy the meeting code (or copy the URL from the info button).
5. Open an **Incognito Window** (or a second browser tab/window), sign in with another account, and enter the code to join.
6. Both participants will connect via WebRTC with live video, audio, and chat!
