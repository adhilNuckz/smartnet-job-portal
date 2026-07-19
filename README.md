# SmartNet Translation — Document Workflow System

Two-role document workflow app for a translation shop. Owner uploads source documents, translator receives and submits translated output.

## Tech Stack

- **Frontend:** React + Vite, React Router, plain CSS
- **Backend:** Node.js + Express
- **Database:** MongoDB (Mongoose)
- **File storage:** Local disk
- **Image→PDF:** sharp + pdf-lib
- **Auth:** JWT (httpOnly cookies)
- **Notifications:** Telegram Bot API

## Setup

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- Apache with mod_proxy (for production)

### 1. Clone and install

```bash
cd smartNet
cd backend && npm install
cd ../frontend && npm install
```

### 2. Configure environment

```bash
cp backend/.env.example backend/.env
# Edit backend/.env with your values
```

Required env vars:
- `MONGO_URI` — MongoDB connection string
- `JWT_SECRET` — random secret for signing tokens
- `OWNER_PASSWORD` — password for `marzook` (default: smartnet123)
- `TRANSLATOR_PASSWORD` — password for `adhilmk` (default: smartnet123)
- `STORAGE_PATH` — absolute path to storage directory
- `TELEGRAM_BOT_TOKEN` — (optional) Telegram bot token
- `TELEGRAM_CHAT_ID` — (optional) Telegram chat ID

### 3. Run in development

```bash
# Terminal 1: Backend
cd backend
cp .env.example .env  # edit with your values
npm run dev

# Terminal 2: Frontend
cd frontend
npm run dev
```

Frontend runs on `http://localhost:5173`, backend on `http://localhost:5000`.

### 4. Login

| Username | Password | Role |
|---|---|---|
| `marzook` | `smartnet123` | Owner |
| `adhilmk` | `smartnet123` | Translator |

## Deployment (Oracle Cloud)

### 1. Build frontend
```bash
cd frontend
npm run build
```

### 2. Copy files to server
```bash
# On the server
mkdir -p /var/www/smartnet
# Copy backend/, frontend/dist, ecosystem.config.js to /var/www/smartnet/
```

### 3. Install PM2 and start
```bash
cd /var/www/smartnet/backend
npm install --production
pm2 start /var/www/smartnet/ecosystem.config.js
pm2 save
```

### 4. Apache vhost
Copy `smartnet.apache.conf` to `/etc/apache2/sites-available/smartnet.conf`:
```bash
sudo a2enmod proxy proxy_http ssl rewrite
sudo a2ensite smartnet
sudo systemctl reload apache2
```

### 5. SSL (Let's Encrypt)
```bash
sudo certbot --apache -d smartnet.nighttime.online
```

## File Storage

Files are stored at the path specified by `STORAGE_PATH` (default: `../storage` relative to backend). This directory must be outside the web root. Files are served only through authenticated Express download endpoints.

## Design Decisions

- **Explicit "Start Task" button** — translator must explicitly start a task rather than auto-starting on first file upload, giving them control over when they begin.
- **Synchronous image→PDF conversion** — fine for single-user scale. For production with many concurrent jobs, move this to a background queue (Bull/BullMQ + Redis).
- **Plain CSS** — no Tailwind dependency; keeps the build lean and avoids configuration overhead.
- **Polling every 30s** — lightweight SSE could be added later for real-time feel without WebSocket infra.
