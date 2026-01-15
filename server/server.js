import cors from "cors";
import crypto from "crypto";
import dotenv from "dotenv";
import express from "express";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || "0.0.0.0";
const INITIAL_PAGE = process.env.INITIAL_PAGE || "/";
const PRESENTER_PASSWORD = process.env.PRESENTER_PASSWORD;

// State management
let clients = [];
let currentPage = INITIAL_PAGE;
const activeSessions = new Map();

// Session duration: 24 hours
const SESSION_DURATION = 24 * 60 * 60 * 1000;

// Middleware
app.use(cors());
app.use(express.json());

// Utility functions
function generateSessionToken() {
  return crypto.randomBytes(32).toString("hex");
}

function isValidSession(token) {
  if (!token) return false;
  const session = activeSessions.get(token);
  if (!session) return false;
  if (Date.now() > session.expires) {
    activeSessions.delete(token);
    return false;
  }
  return true;
}

function createSession() {
  const token = generateSessionToken();
  activeSessions.set(token, {
    expires: Date.now() + SESSION_DURATION,
    createdAt: Date.now(),
  });
  return token;
}

function broadcast(page) {
  currentPage = page;
  console.log(`[Broadcast] Sending to ${clients.length} clients: ${page}`);

  clients.forEach((client) => {
    try {
      client.write(`data: ${page}\n\n`);
    } catch (error) {
      console.error("[Broadcast] Error sending to client:", error.message);
    }
  });
}

function cleanupExpiredSessions() {
  const now = Date.now();
  for (const [token, session] of activeSessions.entries()) {
    if (now > session.expires) {
      activeSessions.delete(token);
      console.log(
        `[Session] Expired session cleaned up: ${token.substring(0, 8)}...`,
      );
    }
  }
}

// Authentication middleware
function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace("Bearer ", "");

  if (!isValidSession(token)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  next();
}

// Routes
app.post("/api/auth/login", (req, res) => {
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ error: "Password required" });
  }

  if (password !== PRESENTER_PASSWORD) {
    return res.status(401).json({ error: "Invalid password" });
  }

  const token = createSession();
  console.log(`[Auth] New session created: ${token.substring(0, 8)}...`);

  res.json({
    success: true,
    token,
    expiresIn: SESSION_DURATION,
  });
});

app.post("/api/auth/logout", requireAuth, (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  activeSessions.delete(token);
  console.log(`[Auth] Session logged out: ${token?.substring(0, 8)}...`);
  res.json({ success: true });
});

app.get("/api/auth/verify", (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  const valid = isValidSession(token);
  res.json({ valid });
});

app.get("/events", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  res.write(`data: ${currentPage}\n\n`);

  clients.push(res);
  console.log(`[SSE] Client connected. Total: ${clients.length - 1}`);

  req.on("close", () => {
    clients = clients.filter((client) => client !== res);
    console.log(`[SSE] Client disconnected. Total: ${clients.length - 1}`);
  });
});

app.post("/navigate", requireAuth, (req, res) => {
  const { page } = req.body;

  if (!page) {
    return res.status(400).json({ error: "Missing page parameter" });
  }

  broadcast(page);
  res.json({ success: true, page });
});

app.get("/status", requireAuth, (_req, res) => {
  res.json({
    clients: clients.length,
    currentPage: currentPage,
    activeSessions: activeSessions.size,
  });
});

app.get("/presenter", (_req, res) => {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Presenter Control</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        :root {
            --bg-primary: #0a0a0a;
            --bg-secondary: #1a1a1a;
            --bg-tertiary: #2a2a2a;
            --border-color: #2a2a2a;
            --text-primary: #ffffff;
            --text-secondary: #888;
            --accent: #3b82f6;
            --accent-hover: #2563eb;
            --success: #10b981;
            --error: #ef4444;
            --warning: #f59e0b;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            background: var(--bg-primary);
            min-height: 100vh;
            color: var(--text-primary);
            line-height: 1.6;
        }

        .container {
            max-width: 1000px;
            margin: 0 auto;
            padding: 20px;
        }

        /* Login Screen */
        .login-screen {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            padding: 20px;
        }

        .login-card {
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-radius: 20px;
            padding: 48px;
            width: 100%;
            max-width: 420px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        }

        .login-card h1 {
            font-size: 2rem;
            margin-bottom: 8px;
            text-align: center;
        }

        .login-card .subtitle {
            text-align: center;
            color: var(--text-secondary);
            margin-bottom: 32px;
            font-size: 0.95rem;
        }

        .form-group {
            margin-bottom: 24px;
        }

        .form-group label {
            display: block;
            margin-bottom: 8px;
            font-weight: 500;
            font-size: 0.9rem;
        }

        .form-group input {
            width: 100%;
            padding: 14px 16px;
            border: 1px solid var(--bg-tertiary);
            border-radius: 10px;
            background: var(--bg-primary);
            color: var(--text-primary);
            font-size: 1rem;
            transition: all 0.2s;
        }

        .form-group input:focus {
            outline: none;
            border-color: var(--accent);
            background: var(--bg-secondary);
        }

        .btn {
            width: 100%;
            padding: 14px 24px;
            border: none;
            border-radius: 10px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
        }

        .btn-primary {
            background: var(--accent);
            color: white;
        }

        .btn-primary:hover:not(:disabled) {
            background: var(--accent-hover);
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
        }

        .btn-primary:active {
            transform: translateY(0);
        }

        .btn-primary:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .error-message {
            background: rgba(239, 68, 68, 0.1);
            border: 1px solid var(--error);
            color: var(--error);
            padding: 12px 16px;
            border-radius: 8px;
            margin-bottom: 20px;
            font-size: 0.9rem;
            display: none;
        }

        .error-message.show {
            display: block;
        }

        /* Main App */
        .main-app {
            display: none;
        }

        .main-app.show {
            display: block;
        }

        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 32px;
            padding-bottom: 20px;
            border-bottom: 1px solid var(--border-color);
        }

        .header h1 {
            font-size: clamp(1.75rem, 5vw, 2.25rem);
            font-weight: 700;
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .logout-btn {
            padding: 10px 20px;
            background: transparent;
            border: 1px solid var(--border-color);
            color: var(--text-secondary);
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.2s;
            font-size: 0.9rem;
        }

        .logout-btn:hover {
            border-color: var(--text-secondary);
            color: var(--text-primary);
            background: var(--bg-tertiary);
        }

        .status-bar {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
            margin-bottom: 32px;
        }

        .status-card {
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-radius: 12px;
            padding: 20px;
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .status-card .label {
            font-size: 0.85rem;
            color: var(--text-secondary);
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .status-card .value {
            font-size: 1.75rem;
            font-weight: 700;
        }

        .section {
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-radius: 16px;
            padding: 28px;
            margin-bottom: 24px;
        }

        .section h2 {
            font-size: 1.25rem;
            margin-bottom: 20px;
            font-weight: 600;
        }

        .presets {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 12px;
        }

        .nav-btn {
            background: var(--text-primary);
            border: none;
            color: var(--bg-primary);
            padding: 16px 20px;
            border-radius: 10px;
            font-size: 0.95rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            text-align: left;
            width: 100%;
            box-shadow: 0 2px 8px rgba(255, 255, 255, 0.1);
        }

        .nav-btn:hover {
            background: #f0f0f0;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(255, 255, 255, 0.15);
        }

        .nav-btn:active {
            transform: translateY(0);
        }

        .manual-control {
            display: grid;
            grid-template-columns: 1fr auto;
            gap: 12px;
            align-items: stretch;
        }

        .manual-control input {
            padding: 16px;
            border: 1px solid var(--bg-tertiary);
            border-radius: 10px;
            background: var(--bg-primary);
            color: var(--text-primary);
            font-size: 1rem;
        }

        .manual-control input::placeholder {
            color: var(--text-secondary);
        }

        .manual-control input:focus {
            outline: none;
            border-color: var(--accent);
        }

        .manual-control button {
            min-width: 100px;
            text-align: center;
            background: var(--accent);
            color: white;
        }

        .manual-control button:hover {
            background: var(--accent-hover);
        }

        .current-page {
            margin-top: 16px;
            padding: 16px;
            background: var(--bg-primary);
            border: 1px solid var(--border-color);
            border-radius: 10px;
            font-family: 'SF Mono', 'Monaco', 'Courier New', monospace;
            font-size: 0.85rem;
            word-break: break-all;
            color: var(--text-secondary);
        }

        .current-page strong {
            color: var(--text-primary);
        }

        /* Toast Notifications */
        .toast {
            position: fixed;
            bottom: 24px;
            right: 24px;
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            color: var(--text-primary);
            padding: 16px 20px;
            border-radius: 10px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
            transform: translateY(100px);
            opacity: 0;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            z-index: 1000;
            max-width: 400px;
        }

        .toast.show {
            transform: translateY(0);
            opacity: 1;
        }

        .toast.success {
            border-color: var(--success);
        }

        .toast.error {
            border-color: var(--error);
        }

        @media (max-width: 768px) {
            .container {
                padding: 16px;
            }

            .login-card {
                padding: 32px 24px;
            }

            .header {
                flex-direction: column;
                align-items: flex-start;
                gap: 16px;
            }

            .presets {
                grid-template-columns: 1fr;
            }

            .manual-control {
                grid-template-columns: 1fr;
            }

            .status-bar {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <!-- Login Screen -->
    <div id="loginScreen" class="login-screen">
        <div class="login-card">
            <h1>🎯 Presenter</h1>
            <p class="subtitle">Enter password to access controls</p>
            <div id="loginError" class="error-message"></div>
            <form id="loginForm">
                <div class="form-group">
                    <label for="password">Password</label>
                    <input
                        type="password"
                        id="password"
                        name="password"
                        placeholder="Enter your password"
                        autocomplete="current-password"
                        required
                    />
                </div>
                <button type="submit" class="btn btn-primary" id="loginBtn">
                    Sign In
                </button>
            </form>
        </div>
    </div>

    <!-- Main App -->
    <div id="mainApp" class="main-app">
        <div class="container">
            <div class="header">
                <h1>🎯 Presenter Control</h1>
                <button class="logout-btn" onclick="logout()">Logout</button>
            </div>

            <div class="status-bar">
                <div class="status-card">
                    <div class="label">Connected Participants</div>
                    <div class="value" id="clientCount">0</div>
                </div>
                <div class="status-card">
                    <div class="label">Active Sessions</div>
                    <div class="value" id="sessionCount">0</div>
                </div>
            </div>

            <div class="section">
                <h2>Quick Navigation</h2>
                <div class="presets">
                    <button class="nav-btn" onclick="navigate('/')">🏠 Home</button>
                    <button class="nav-btn" onclick="navigate('/01-devops-mindset/')">01: DevOps Mindset</button>
                    <button class="nav-btn" onclick="navigate('/02-machine-setup/')">02: Machine Setup</button>
                    <button class="nav-btn" onclick="navigate('/03-project-overview/')">03: Project Overview</button>
                    <button class="nav-btn" onclick="navigate('/04-dockerizing/')">04: Dockerizing</button>
                    <button class="nav-btn" onclick="navigate('/05-manual-build-test/')">05: Manual Build & Test</button>
                    <button class="nav-btn" onclick="navigate('/06-actions-runner/')">06: Actions Runner</button>
                    <button class="nav-btn" onclick="navigate('/07-automated-ci/')">07: Automated CI</button>
                    <button class="nav-btn" onclick="navigate('/08-deployment/')">08: Deployment</button>
                    <button class="nav-btn" onclick="navigate('/09-troubleshooting/')">09: Troubleshooting</button>
                </div>
            </div>

            <div class="section">
                <h2>Manual Navigation</h2>
                <div class="manual-control">
                    <input type="text" id="customPath" placeholder="/custom-page/" />
                    <button onclick="navigateCustom()">Go</button>
                </div>
                <div class="current-page">
                    <strong>Current:</strong> <span id="currentPage">${INITIAL_PAGE}</span>
                </div>
            </div>
        </div>
    </div>

    <div id="toast" class="toast"></div>

    <script>
        let authToken = localStorage.getItem('presenterToken');
        let currentPage = '${INITIAL_PAGE}';

        // Toast notification
        function showToast(message, type = 'success') {
            const toast = document.getElementById('toast');
            toast.textContent = message;
            toast.className = 'toast show ' + type;
            setTimeout(() => {
                toast.classList.remove('show');
            }, 3000);
        }

        // Authentication
        async function login(e) {
            e.preventDefault();
            const loginBtn = document.getElementById('loginBtn');
            const loginError = document.getElementById('loginError');
            const password = document.getElementById('password').value;

            loginBtn.disabled = true;
            loginBtn.textContent = 'Signing in...';
            loginError.classList.remove('show');

            try {
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password })
                });

                const data = await response.json();

                if (response.ok) {
                    authToken = data.token;
                    localStorage.setItem('presenterToken', authToken);
                    showMainApp();
                    showToast('Successfully logged in');
                } else {
                    loginError.textContent = data.error || 'Login failed';
                    loginError.classList.add('show');
                }
            } catch (error) {
                loginError.textContent = 'Connection error. Please try again.';
                loginError.classList.add('show');
            } finally {
                loginBtn.disabled = false;
                loginBtn.textContent = 'Sign In';
            }
        }

        async function logout() {
            try {
                await fetch('/api/auth/logout', {
                    method: 'POST',
                    headers: { 'Authorization': 'Bearer ' + authToken }
                });
            } catch (error) {
                console.error('Logout error:', error);
            }

            authToken = null;
            localStorage.removeItem('presenterToken');
            showLoginScreen();
            showToast('Logged out successfully');
        }

        async function verifyAuth() {
            if (!authToken) {
                showLoginScreen();
                return false;
            }

            try {
                const response = await fetch('/api/auth/verify', {
                    headers: { 'Authorization': 'Bearer ' + authToken }
                });
                const data = await response.json();

                if (data.valid) {
                    showMainApp();
                    return true;
                } else {
                    authToken = null;
                    localStorage.removeItem('presenterToken');
                    showLoginScreen();
                    return false;
                }
            } catch (error) {
                console.error('Auth verification error:', error);
                showLoginScreen();
                return false;
            }
        }

        function showLoginScreen() {
            document.getElementById('loginScreen').style.display = 'flex';
            document.getElementById('mainApp').classList.remove('show');
        }

        function showMainApp() {
            document.getElementById('loginScreen').style.display = 'none';
            document.getElementById('mainApp').classList.add('show');
            updateStatus();
            setInterval(updateStatus, 2000);
        }

        // Status updates
        async function updateStatus() {
            if (!authToken) return;

            try {
                const response = await fetch('/status', {
                    headers: { 'Authorization': 'Bearer ' + authToken }
                });

                if (response.status === 401) {
                    logout();
                    return;
                }

                const data = await response.json();
                document.getElementById('clientCount').textContent = data.clients - 1;
                document.getElementById('sessionCount').textContent = data.activeSessions;
                currentPage = data.currentPage;
                document.getElementById('currentPage').textContent = currentPage;
            } catch (error) {
                console.error('Failed to fetch status:', error);
            }
        }

        // Navigation
        async function navigate(page) {
            if (!authToken) {
                showToast('Please log in first', 'error');
                return;
            }

            try {
                const response = await fetch('/navigate', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + authToken
                    },
                    body: JSON.stringify({ page })
                });

                if (response.status === 401) {
                    logout();
                    return;
                }

                if (response.ok) {
                    currentPage = page;
                    document.getElementById('currentPage').textContent = page;
                    showToast('Navigated to ' + page);
                    updateStatus();
                } else {
                    showToast('Navigation failed', 'error');
                }
            } catch (error) {
                console.error('Navigation failed:', error);
                showToast('Navigation failed', 'error');
            }
        }

        function navigateCustom() {
            const path = document.getElementById('customPath').value.trim();
            if (path) {
                navigate(path);
                document.getElementById('customPath').value = '';
            }
        }

        // Event listeners
        document.getElementById('loginForm').addEventListener('submit', login);
        document.getElementById('customPath').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') navigateCustom();
        });

        // Initialize
        verifyAuth();
    </script>
</body>
</html>
  `;

  res.send(html);
});

app.get("/", (_req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>DevOps Presenter Server</title>
      <style>
        body {
          font-family: system-ui, -apple-system, sans-serif;
          max-width: 600px;
          margin: 100px auto;
          padding: 20px;
          background: #0a0a0a;
          color: #fff;
        }
        h1 { color: #3b82f6; }
        a { color: #3b82f6; text-decoration: none; }
        a:hover { text-decoration: underline; }
      </style>
    </head>
    <body>
      <h1>🎯 DevOps Presenter Server</h1>
      <p>Server is running successfully.</p>
      <p><a href="/presenter">→ Go to Presenter Control Panel</a></p>
    </body>
    </html>
  `);
});

// Cleanup expired sessions every hour
setInterval(cleanupExpiredSessions, 60 * 60 * 1000);

app.listen(PORT, HOST, () => {
  console.log(`
╔══════════════════════════════════════════════╗
║   DevOps Presenter Server - Node.js          ║
╠══════════════════════════════════════════════╣
║  Server running at:                          ║
║  http://${HOST}:${PORT}                     ║
║                                              ║
║  Presenter Control:                          ║
║  http://${HOST}:${PORT}/presenter          ║
║                                              ║
║  SSE Stream:                                 ║
║  http://${HOST}:${PORT}/events             ║
║                                              ║
║  Password: ${PRESENTER_PASSWORD.length > 0 ? "***" + PRESENTER_PASSWORD.slice(-4) : "NOT SET"}                          ║
╚══════════════════════════════════════════════╝
  `);
});

process.on("SIGTERM", () => {
  console.log("\n[Server] SIGTERM received. Closing server...");
  clients.forEach((client) => {
    try {
      client.end();
    } catch (error) {
      console.error("[Server] Error closing client:", error.message);
    }
  });
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("\n[Server] SIGINT received. Closing server...");
  process.exit(0);
});
