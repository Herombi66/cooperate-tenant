# Deployment Guide

## Overview
- **Frontend**: React (Vite) on Vercel
- **Backend**: Node.js/Express on Digital Ocean (App Platform or Droplet)
- **Database**: PostgreSQL on Digital Ocean

## Frontend (Vercel)
1. **Environment Variables**:
   Set the following in Vercel Project Settings:
   - `VITE_API_URL`: URL of your backend (e.g., `https://api.yourdomain.com` or Digital Ocean App URL)

2. **Configuration**:
   - `vercel.json` handles routing (SPA fallback).
   - `vite.config.ts` proxies `/api` calls in local development but Vercel uses the real `VITE_API_URL`.

## Backend (Digital Ocean)
1. **Environment Variables**:
   - `DATABASE_URL`: `postgresql://user:password@host:port/dbname`
   - `FRONTEND_URL`: `https://your-vercel-app.vercel.app` (to allow CORS)
   - `JWT_SECRET`: Secure random string
   - `PORT`: `3000` (or as configured)

2. **Docker Deployment**:
   - A `Dockerfile` is included in `backend/` for containerized deployment.
   - Ensure the container exposes port 3001 (or matching your PORT env).

## Database
- Ensure your Digital Ocean Managed Database allows connections from your Backend's IP or VPC.
- Run migrations using `sequelize-cli` or ensure `sequelize.sync()` runs on startup (currently enabled in `app.js`).

## Verification Steps
1. **CORS**: Check if `FRONTEND_URL` matches your Vercel domain.
2. **Connectivity**: Ensure Backend can reach Database (check `DATABASE_URL`).
3. **API**: Frontend calls should use `VITE_API_URL`/endpoint.
