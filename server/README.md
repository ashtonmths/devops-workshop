# DevOps Presenter Server

A simple, robust Server-Sent Events (SSE) broadcast server written in Node.js. Designed for live workshops to synchronize participant browsers with the presenter's screen.

## Features

- **Real-time Broadcasting**: Uses SSE to push page updates to all connected clients instantly.
- **Password Protected**: Secure presenter control panel with password authentication.
- **Session Management**: Token-based sessions with 24-hour expiry.
- **Mobile-Friendly Control**: Dedicated `/presenter` UI for controlling the session from a phone.
- **Modern UI**: Clean, dark-themed interface with toast notifications.
- **Robustness**: Handles client disconnects and late joiners gracefully.

## Prerequisites

- **Node.js**: Version 18 or later (for ES modules and `--watch` support).

## Setup

### 1. Navigate to the directory

```bash
cd server
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure the server

Copy the example configuration file:

```bash
cp .env.example .env
```

Edit `.env` to match your network setup:

```env
PORT=3001                    # The port to listen on
HOST=0.0.0.0                # Bind to all interfaces (use 127.0.0.1 for localhost only)
INITIAL_PAGE=/              # The starting page path
PRESENTER_PASSWORD=  # Password for presenter control (CHANGE THIS!)
```

**Important**: Change the `PRESENTER_PASSWORD` to something secure before using in production!

## Running the Server

### Development

Run with auto-reload on file changes:

```bash
npm run dev
```

### Production

Run normally:

```bash
npm start
```

Or use a process manager like PM2:

```bash
npm install -g pm2
pm2 start server.js --name presenter-server
```

## Usage

### 1. Presenter Control

Open the control interface on your phone or laptop:

```
http://<YOUR_LAN_IP>:3001/presenter
```

You'll be prompted to enter the password you configured in `.env`.

Once logged in:
- **Presets**: Click the buttons to quickly navigate to specific workshop sections.
- **Manual**: Type a path and click "Navigate".
- **Status**: See connected participants and active sessions in real-time.
- **Logout**: Sessions last 24 hours but you can manually logout anytime.

### 2. Participant Client

Participants (or the main presentation screen) connect to the SSE stream.

#### Integration (Frontend Code Example):

```javascript
const evtSource = new EventSource("http://<YOUR_LAN_IP>:3001/events");

evtSource.onmessage = function(event) {
    const newPath = event.data;
    console.log("Navigate to:", newPath);
    // Logic to redirect or update the view
    window.location.href = newPath;
};

evtSource.onerror = function(error) {
    console.error("SSE connection error:", error);
};
```

### 3. API (Authenticated)

First, authenticate to get a session token:

```bash
# Login
curl -X POST http://localhost:3001/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"password": "password"}'
```

Response:
```json
{
  "success": true,
  "token": "abc123...",
  "expiresIn": 86400000
}
```

Then use the token for navigation:

```bash
# Navigate (requires authentication)
curl -X POST http://localhost:3001/navigate \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_TOKEN_HERE" \
     -d '{"page": "/04-dockerizing/"}'
```

Response:
```json
{
  "success": true,
  "page": "/04-dockerizing/"
}
```

## Endpoints

| Endpoint | Method | Auth Required | Description |
|----------|--------|---------------|-------------|
| `/` | GET | No | Server info page |
| `/presenter` | GET | No | Presenter control UI (login required in UI) |
| `/events` | GET | No | SSE stream for clients |
| `/api/auth/login` | POST | No | Login with password |
| `/api/auth/logout` | POST | Yes | Logout and invalidate session |
| `/api/auth/verify` | GET | Yes | Verify if token is valid |
| `/navigate` | POST | Yes | Navigate to a page |
| `/status` | GET | Yes | Get server status (clients, sessions) |

## Troubleshooting

### Can't Login to Presenter

- Verify your password matches what's in `.env` file.
- Check browser console for connection errors.
- Ensure the server is running and accessible.

### Session Expired

- Sessions last 24 hours. Simply log in again.
- Old sessions are automatically cleaned up.

### Connection Refused

- Ensure the server is running and the `PORT` in `.env` matches your URL.
- Check that no other service is using the same port.

### Not Accessible on LAN

- Ensure `HOST` is set to `0.0.0.0` (not `127.0.0.1`).
- Check your firewall settings and allow incoming connections on the port.

### Clients Not Updating

- Check the browser console for connection errors.
- Ensure the client code handles SSE correctly.
- Verify CORS is not blocking the connection (server has CORS enabled by default).

### "Unauthorized" Errors

- Your session token may have expired. Log out and log in again.
- Ensure you're sending the `Authorization: Bearer <token>` header.

### Development Mode Not Auto-Reloading

- Ensure you're using Node.js 18+ with `--watch` flag support.
- Use `npm run dev` instead of `npm start`.

## Architecture

```
┌─────────────┐
│  Presenter  │ ──1. Login────────┐
│   Control   │                   │
│             │ ──2. POST /navigate (+ token)─┐
└─────────────┘                   │           │
                                  ▼           ▼
                           ┌──────────────────┐
┌─────────────┐           │     Server       │
│ Participant │◄──SSE─────│   (Node.js)      │
│   Browser   │           │  + Auth System   │
└─────────────┘           └──────────────────┘
                                  ▲
┌─────────────┐                   │
│ Participant │◄──SSE─────────────┘
│   Browser   │
└─────────────┘
```

## Security Notes

- Passwords are compared in plain text (consider using bcrypt for production).
- Session tokens are stored in memory (will be lost on server restart).
- Use HTTPS in production to protect credentials in transit.
- Change the default password immediately.
- Consider rate limiting for production deployments.

## License

MIT
