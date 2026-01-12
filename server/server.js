import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';
const INITIAL_PAGE = process.env.INITIAL_PAGE || '/docs/';

let clients = [];
let currentPage = INITIAL_PAGE;

app.use(cors());
app.use(express.json());

function broadcast(page) {
  currentPage = page;
  console.log(`Broadcasting to ${clients.length} clients: ${page}`);
  
  clients.forEach(client => {
    client.write(`data: ${page}\n\n`);
  });
}

app.get('/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  res.write(`data: ${currentPage}\n\n`);

  clients.push(res);
  console.log(`Client connected. Total clients: ${clients.length}`);

  req.on('close', () => {
    clients = clients.filter(client => client !== res);
    console.log(`Client disconnected. Total clients: ${clients.length}`);
  });
});

app.post('/navigate', (req, res) => {
  const { page } = req.body;
  
  if (!page) {
    return res.status(400).json({ error: 'Missing page parameter' });
  }

  broadcast(page);
  res.json({ success: true, page });
});

app.get('/presenter', (req, res) => {
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
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
            color: #fff;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
        }
        h1 {
            font-size: 2rem;
            margin-bottom: 10px;
            text-align: center;
        }
        .status {
            text-align: center;
            margin-bottom: 30px;
            opacity: 0.9;
            font-size: 0.9rem;
        }
        .section {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border-radius: 16px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        }
        h2 {
            font-size: 1.2rem;
            margin-bottom: 15px;
            opacity: 0.9;
        }
        .presets {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
            gap: 10px;
        }
        button {
            background: rgba(255, 255, 255, 0.2);
            border: 1px solid rgba(255, 255, 255, 0.3);
            color: #fff;
            padding: 12px 20px;
            border-radius: 8px;
            font-size: 0.9rem;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
            text-align: left;
        }
        button:hover {
            background: rgba(255, 255, 255, 0.3);
            transform: translateY(-2px);
        }
        button:active {
            transform: translateY(0);
        }
        .manual-control {
            display: flex;
            gap: 10px;
        }
        input {
            flex: 1;
            padding: 12px;
            border: 1px solid rgba(255, 255, 255, 0.3);
            border-radius: 8px;
            background: rgba(255, 255, 255, 0.1);
            color: #fff;
            font-size: 0.9rem;
        }
        input::placeholder {
            color: rgba(255, 255, 255, 0.6);
        }
        .manual-control button {
            flex-shrink: 0;
            text-align: center;
        }
        .current-page {
            margin-top: 10px;
            padding: 10px;
            background: rgba(0, 0, 0, 0.2);
            border-radius: 8px;
            font-family: monospace;
            font-size: 0.85rem;
            word-break: break-all;
        }
        .feedback {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            background: #10b981;
            border-radius: 8px;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
            opacity: 0;
            transition: opacity 0.3s;
        }
        .feedback.show {
            opacity: 1;
        }
    </style>
</head>
<body>
    <div class="feedback" id="feedback">✓ Navigated!</div>
    <div class="container">
        <h1>🎯 Presenter Control</h1>
        <div class="status">
            <span id="clientCount">0</span> participant(s) connected
        </div>

        <div class="section">
            <h2>Quick Navigation</h2>
            <div class="presets">
                <button onclick="navigate('/docs/')">Home</button>
                <button onclick="navigate('/docs/01-devops-mindset/')">01: DevOps Mindset</button>
                <button onclick="navigate('/docs/02-machine-setup/')">02: Machine Setup</button>
                <button onclick="navigate('/docs/03-project-overview/')">03: Project Overview</button>
                <button onclick="navigate('/docs/04-dockerizing/')">04: Dockerizing</button>
                <button onclick="navigate('/docs/05-manual-build-test/')">05: Manual Build</button>
                <button onclick="navigate('/docs/06-actions-runner/')">06: Actions Runner</button>
                <button onclick="navigate('/docs/07-automated-ci/')">07: Automated CI</button>
                <button onclick="navigate('/docs/08-deployment/')">08: Deployment</button>
                <button onclick="navigate('/docs/09-troubleshooting/')">09: Troubleshooting</button>
            </div>
        </div>

        <div class="section">
            <h2>Manual Navigation</h2>
            <div class="manual-control">
                <input type="text" id="customPath" placeholder="/docs/custom-page/" />
                <button onclick="navigateCustom()">Go</button>
            </div>
            <div class="current-page">
                Current: <span id="currentPage">${INITIAL_PAGE}</span>
            </div>
        </div>
    </div>

    <script>
        let currentPage = '${INITIAL_PAGE}';

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
                    showFeedback();
                }
            } catch (error) {
                console.error('Navigation failed:', error);
            }
        }

        function navigateCustom() {
            const path = document.getElementById('customPath').value.trim();
            if (path) {
                navigate(path);
                document.getElementById('customPath').value = '';
            }
        }

        function showFeedback() {
            const feedback = document.getElementById('feedback');
            feedback.classList.add('show');
            setTimeout(() => feedback.classList.remove('show'), 2000);
        }

        // Handle Enter key in custom path input
        document.getElementById('customPath').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') navigateCustom();
        });

        // Connect to SSE to get client count updates (optional enhancement)
        // For now, just showing 0
    </script>
</body>
</html>
  `;
  
  res.send(html);
});

app.get('/', (req, res) => {
  res.send('DevOps Presenter Server - Visit /presenter for controls');
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

process.on('SIGTERM', () => {
  console.log('SIGTERM received. Closing server...');
  process.exit(0);
});