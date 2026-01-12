# DevOps Presenter Server

A simple, robust Server-Sent Events (SSE) broadcast server written in Node.js. Designed for live workshops to synchronize participant browsers with the presenter's screen.

## Features

- **Real-time Broadcasting**: Uses SSE to push page updates to all connected clients instantly.
- **Mobile-Friendly Control**: Dedicated `/presenter` UI for controlling the session from a phone.
- **Zero Dependencies**: Built using only Node.js standard library (+ dotenv for config).
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
PORT=3001           # The port to listen on
HOST=0.0.0.0       # Bind to all interfaces (use 127.0.0.1 for localhost only)
INITIAL_PAGE=/docs/ # The starting page path
```

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

- **Presets**: Click the buttons to quickly navigate to specific workshop sections.
- **Manual**: Type a path and click "Navigate".

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

### 3. API (Optional)

You can also control the server programmatically via HTTP POST:

```bash
curl -X POST http://localhost:3001/navigate \
     -H "Content-Type: application/json" \
     -d '{"page": "/docs/04-dockerizing/"}'
```

#### Response:

```json
{
  "success": true,
  "page": "/docs/04-dockerizing/"
}
```

## Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Server info |
| `/presenter` | GET | Presenter control UI |
| `/events` | GET | SSE stream for clients |
| `/navigate` | POST | Navigate to a page (JSON body: `{"page": "/path/"}`) |

## Troubleshooting

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

### Development Mode Not Auto-Reloading

- Ensure you're using Node.js 18+ with `--watch` flag support.
- Use `npm run dev` instead of `npm start`.

## Architecture

```
┌─────────────┐
│  Presenter  │ ──POST /navigate──┐
│   Control   │                   │
└─────────────┘                   ▼
                           ┌─────────────┐
┌─────────────┐           │   Server    │
│ Participant │◄──SSE─────│  (Node.js)  │
│   Browser   │           └─────────────┘
└─────────────┘                   ▲
                                  │
┌─────────────┐                   │
│ Participant │◄──SSE─────────────┘
│   Browser   │
└─────────────┘
```

## License

MIT
