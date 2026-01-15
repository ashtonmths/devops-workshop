import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || "0.0.0.0";
const INITIAL_PAGE = process.env.INITIAL_PAGE || "/";

let clients = [];
let currentPage = INITIAL_PAGE;

app.use(cors());
app.use(express.json());

function broadcast(page) {
  currentPage = page;
  console.log(`Broadcasting to ${clients.length} clients: ${page}`);

  clients.forEach((client) => {
    client.write(`data: ${page}\n\n`);
  });
}

app.get("/events", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  res.write(`data: ${currentPage}\n\n`);

  clients.push(res);
  console.log(`Client connected. Total clients: ${clients.length}`);

  req.on("close", () => {
    clients = clients.filter((client) => client !== res);
    console.log(`Client disconnected. Total clients: ${clients.length}`);
  });
});

app.post("/navigate", (req, res) => {
  const { page } = req.body;

  if (!page) {
    return res.status(400).json({ error: "Missing page parameter" });
  }

  broadcast(page);
  res.json({ success: true, page });
});

app.get("/status", (res) => {
  res.json({
    clients: clients.length,
    currentPage: currentPage,
  });
});

app.get("/presenter", (res) => {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Presenter Control</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/sonner@1.2.0/dist/styles.css">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background: #0a0a0a;
            min-height: 100vh;
            padding: 20px;
            color: #ffffff;
        }
        .container {
            max-width: 900px;
            margin: 0 auto;
        }
        h1 {
            font-size: clamp(1.75rem, 5vw, 2.5rem);
            margin-bottom: 12px;
            text-align: center;
            font-weight: 700;
        }
        .status {
            text-align: center;
            margin-bottom: 32px;
            color: #888;
            font-size: 0.95rem;
        }
        .section {
            background: #1a1a1a;
            border: 1px solid #2a2a2a;
            border-radius: 16px;
            padding: 28px;
            margin-bottom: 24px;
        }
        h2 {
            font-size: 1.25rem;
            margin-bottom: 20px;
            font-weight: 600;
            color: #ffffff;
        }
        .presets {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 12px;
        }
        button {
            background: #ffffff;
            border: none;
            color: #0a0a0a;
            padding: 18px 24px;
            border-radius: 10px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            text-align: left;
            width: 100%;
            box-shadow: 0 2px 8px rgba(255, 255, 255, 0.1);
        }
        button:hover {
            background: #f0f0f0;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(255, 255, 255, 0.15);
        }
        button:active {
            transform: translateY(0);
        }
        .manual-control {
            display: grid;
            grid-template-columns: 1fr auto;
            gap: 12px;
            align-items: stretch;
        }
        input {
            padding: 18px;
            border: 1px solid #3a3a3a;
            border-radius: 10px;
            background: #2a2a2a;
            color: #ffffff;
            font-size: 1rem;
        }
        input::placeholder {
            color: #666;
        }
        input:focus {
            outline: none;
            border-color: #4a4a4a;
            background: #2f2f2f;
        }
        .manual-control button {
            min-width: 100px;
            text-align: center;
        }
        .current-page {
            margin-top: 16px;
            padding: 14px;
            background: #0a0a0a;
            border: 1px solid #2a2a2a;
            border-radius: 10px;
            font-family: 'Courier New', monospace;
            font-size: 0.85rem;
            word-break: break-all;
            color: #888;
        }
        @media (max-width: 768px) {
            .presets {
                grid-template-columns: 1fr;
            }
            .manual-control {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div id="sonner-container"></div>
    <div class="container">
        <h1>🎯 Presenter Control</h1>
        <div class="status">
            <span id="clientCount">0</span> participant(s) connected
        </div>

        <div class="section">
            <h2>Quick Navigation</h2>
            <div class="presets">
                <button onclick="navigate('/')">Home</button>
                <button onclick="navigate('/01-devops-mindset/')">01: DevOps Mindset</button>
                <button onclick="navigate('/02-machine-setup/')">02: Machine Setup</button>
                <button onclick="navigate('/03-project-overview/')">03: Project Overview</button>
                <button onclick="navigate('/04-dockerizing/')">04: Dockerizing</button>
                <button onclick="navigate('/05-manual-build-test/')">05: Manual Build & Test</button>
                <button onclick="navigate('/06-actions-runner/')">06: Actions Runner</button>
                <button onclick="navigate('/07-automated-ci/')">07: Automated CI</button>
                <button onclick="navigate('/08-deployment/')">08: Deployment</button>
                <button onclick="navigate('/09-troubleshooting/')">09: Troubleshooting</button>
            </div>
        </div>

        <div class="section">
            <h2>Manual Navigation</h2>
            <div class="manual-control">
                <input type="text" id="customPath" placeholder="/custom-page/" />
                <button onclick="navigateCustom()">Go</button>
            </div>
            <div class="current-page">
                Current: <span id="currentPage">${INITIAL_PAGE}</span>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/sonner@1.2.0/dist/index.umd.js"></script>
    <script>
        const { toast } = window.Sonner;
        let currentPage = '${INITIAL_PAGE}';

        async function updateStatus() {
            try {
                const response = await fetch('/status');
                const data = await response.json();
                document.getElementById('clientCount').textContent = data.clients;
                currentPage = data.currentPage;
                document.getElementById('currentPage').textContent = currentPage;
            } catch (error) {
                console.error('Failed to fetch status:', error);
            }
        }

        async function navigate(page) {
            try {
                const response = await fetch('/navigate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ page })
                });

                if (response.ok) {
                    currentPage = page;
                    document.getElementById('currentPage').textContent = page;
                    toast.success('Navigated to ' + page);
                    updateStatus();
                }
            } catch (error) {
                console.error('Navigation failed:', error);
                toast.error('Navigation failed');
            }
        }

        function navigateCustom() {
            const path = document.getElementById('customPath').value.trim();
            if (path) {
                navigate(path);
                document.getElementById('customPath').value = '';
            }
        }

        document.getElementById('customPath').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') navigateCustom();
        });

        updateStatus();
        setInterval(updateStatus, 2000);
    </script>
</body>
</html>
  `;

  res.send(html);
});

app.get("/", (res) => {
  res.send("DevOps Presenter Server - Visit /presenter for controls");
});

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
╚══════════════════════════════════════════════╝
  `);
});

process.on("SIGTERM", () => {
  console.log("SIGTERM received. Closing server...");
  process.exit(0);
});
