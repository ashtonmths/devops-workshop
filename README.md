# DevOps Workshop

🚀 A comprehensive DevOps workshop with interactive documentation and live presenter synchronization. Built with Astro + MDX for content and Node.js for real-time presentation control.

## Project Structure

```
devops-workshop/
├── client/          # Astro-based documentation site
│   ├── src/
│   │   ├── content/     # Workshop content (MDX)
│   │   └── components/  # UI components
│   └── package.json
├── server/          # SSE broadcast server for presentations
│   ├── server.js
│   └── package.json
└── README.md
```

## Features

### Documentation Site (Client)
- **Interactive Documentation**: Built with Astro and Starlight theme
- **MDX Support**: Write content with JSX components
- **Presenter Sync**: Real-time synchronization with presenter
- **Mobile Responsive**: Works seamlessly on all devices

### Presenter Server
- **Real-time Broadcasting**: SSE-based page synchronization
- **Mobile Control**: Control presentations from your phone
- **REST API**: Programmatic navigation support
- **Zero Config**: Works out of the box with sensible defaults

## Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone --recursive <your-repo-url>
cd devops-workshop
```

2. Install client dependencies:
```bash
cd client
npm install
```

3. Install server dependencies:
```bash
cd ../server
npm install
cp .env.example .env
```

### Running Locally

#### Start the Documentation Site

```bash
cd client
npm run dev
```

The site will be available at `http://localhost:4321`

#### Start the Presenter Server

```bash
cd server
npm start
```

The presenter control will be available at `http://localhost:3001/presenter`

### Development Mode

For auto-reload during development:

```bash
cd client
npm run dev

cd server
npm run dev
```

## Workshop Content

The workshop covers:

1. **DevOps Mindset** - Understanding DevOps culture and principles
2. **Machine Setup** - Environment configuration and tools
3. **Project Overview** - Understanding the workshop project
4. **Dockerizing** - Containerization fundamentals
5. **Manual Build & Test** - CI/CD basics
6. **Actions Runner** - Self-hosted runners setup
7. **Automated CI** - Building CI pipelines
8. **Deployment** - Deployment strategies
9. **Troubleshooting** - Common issues and solutions

## Using the Presenter System

### For Presenters

1. Start the presenter server
2. Open `/presenter` on your phone or laptop
3. Click preset buttons or enter custom paths
4. All connected participants will navigate automatically

### For Participants

The client site automatically connects to the presenter server if configured. Updates happen in real-time without manual intervention.

### Integration

Add to your Astro component:

```javascript
const evtSource = new EventSource("http://localhost:3001/events");

evtSource.onmessage = function(event) {
    const newPath = event.data;
    window.location.href = newPath;
};
```

## Building for Production

### Documentation Site

```bash
cd client
npm run build
npm run preview
```

### Presenter Server

```bash
cd server
npm start
```

Or use a process manager like PM2:

```bash
pm2 start server/server.js --name presenter-server
```

## Git Submodule (Client)

The client is configured as a git submodule to allow independent updates.

### Clone with submodules:
```bash
git clone --recursive <repo-url>
```

### Update submodule:
```bash
git submodule update --remote client
```

### Pull latest client changes:
```bash
cd client
git pull origin master
```

## Configuration

### Client (.env)
Not required for basic usage. Astro uses `astro.config.mjs` for configuration.

### Server (.env)
```env
PORT=3001
HOST=0.0.0.0
INITIAL_PAGE=/docs/
```

## Troubleshooting

### Client Issues

**Sharp installation fails:**
- Ensure you're using Node.js 18+
- Try clearing npm cache: `npm cache clean --force`

**TypeScript errors:**
- Check `tsconfig.json` extends the correct Astro config
- Run `npm install` to ensure dependencies are installed

### Server Issues

**Port already in use:**
- Change PORT in `.env`
- Kill process using the port: `lsof -ti:3001 | xargs kill`

**Clients not connecting:**
- Check CORS settings
- Ensure HOST is `0.0.0.0` for LAN access
- Verify firewall allows the port

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT

## Author

Created for DevOps education and workshop delivery.
