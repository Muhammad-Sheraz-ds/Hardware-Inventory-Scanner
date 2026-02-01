---
title: Hardware Scanner API
emoji: 🖥️
colorFrom: purple
colorTo: pink
sdk: docker
app_port: 7860
pinned: false
---

# Hardware Inventory Scanner - Backend API

```bash
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `GROQ_API_KEY` | Your Groq API key |
| `PORT` | Port number (set automatically by Railway) |

## API Endpoints

- `POST /api/start-session` - Start new scanning session
- `POST /api/process-image` - Process image with AI
- `GET /api/session/{id}` - Get session data
- `GET /api/export/{id}` - Download Excel export
- `DELETE /api/session/{id}` - End session

## Deploy to Railway

1. Push this folder to GitHub
2. Create new project on [Railway](https://railway.app)
3. Connect your GitHub repo
4. Set root directory to `/backend`
5. Add environment variable: `GROQ_API_KEY`
6. Deploy!
