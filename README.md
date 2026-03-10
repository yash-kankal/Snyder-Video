# Snyder Monorepo

This repo is split into two apps:

- `backend/` - Express + MongoDB + Cloudinary API
- `frontend/` - Next.js app (multi-page UI)

## 1) Run backend

```bash
cd /Users/yashwardhankankal/Documents/src/backend
npm start
```

Backend default local URL: `http://localhost:5000`

## 2) Run frontend

Create env file:

```bash
cd /Users/yashwardhankankal/Documents/src/frontend
cp .env.local.example .env.local
```

Install and run:

```bash
npm install
npm run dev
```

Frontend local URL: `http://localhost:3000`

## Routes in frontend

- `/login`
- `/signup`
- `/` (all uploaded videos after login)
- `/my-videos`
- `/video/:id`
