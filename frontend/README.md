# Hardware Inventory Scanner - Frontend

Next.js frontend for the Hardware Inventory Scanner.

## Local Development

```bash
npm install
npm run dev
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Backend API URL (e.g., `https://your-backend.up.railway.app`) |

## Deploy to Vercel

1. Push this folder to GitHub
2. Create new project on [Vercel](https://vercel.com)
3. Connect your GitHub repo
4. Set root directory to `/frontend`
5. Add environment variable: `NEXT_PUBLIC_API_URL` = your Railway backend URL
6. Deploy!
