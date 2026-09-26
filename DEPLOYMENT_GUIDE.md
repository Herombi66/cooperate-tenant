# 🚀 Railway Backend Deployment Guide

This guide will help you deploy your IMAN MCS Backend to Railway.

## 📋 Prerequisites

1. **Railway Account**: Create a free account at [https://railway.app](https://railway.app)
2. **GitHub Repository**: Push your code to GitHub (required for Railway deployment)
3. **Railway CLI** (optional): Install globally with `npm install -g @railway/cli`

## 🚀 Deployment Steps

### Step 1: Connect Your GitHub Repository

1. Log into Railway at [https://railway.app](https://railway.app)
2. Click "New Project" → "Deploy from GitHub repo"
3. Connect your GitHub account and select the repository containing your IMAN MCS project
4. Select the **backend directory** for deployment (Railway will automatically detect the subdirectory)

### Step 2: Database Configuration

Railway will automatically create a PostgreSQL database for you. The database URL will be available as an environment variable `DATABASE_URL`.

### Step 3: Configure Environment Variables

#### View Environment Variables in Railway
1. In your Railway project dashboard, go to the "Variables" tab
2. Add these environment variables:

```env
PORT=3001
JWT_SECRET=your-super-secret-jwt-key-here-change-in-production
FRONTEND_URL=https://your-frontend-url.vercel.app
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=IMAN MCS <noreply@imanmcs.org>
```

#### Important Notes:
- **DATABASE_URL**: Automatically provided by Railway (don't override)
- **JWT_SECRET**: Generate a strong random string (min 32 characters)
- **FRONTEND_URL**: Your deployed frontend URL (e.g., from Vercel)
- **Email Configuration**: Use Gmail App Passwords for EMAIL_PASS

### Step 4: Deploy and Run Migrations

1. **Push Code Changes**: Make sure `railway.json`, `backend/package.json`, and all backend files are committed and pushed
2. **Railway Auto-Deploy**: Railway will automatically detect and deploy your backend
3. **Check Logs**: Monitor deployment in the "Logs" tab to ensure migrations run successfully

### Step 5: Test Your Deployment

#### Health Check
```bash
curl https://your-railway-url.railway.app/health
```

Should return:
```json
{
  "status": "healthy",
  "timestamp": "...",
  "service": "IMAN MCS Backend",
  "version": "1.0.0"
}
```

#### API Testing
```bash
# Test your API endpoints
curl https://your-railway-url.railway.app/api/users
```

## 🛠 Troubleshooting

### Common Issues:

#### 1. Database Connection Issues
- **Check**: Ensure `DATABASE_URL` is set in Railway's environment variables
- **Verify**: Run migrations manually if needed: `railway run npm run migrate`

#### 2. Build Failures
- **Check**: Railway uses Nixpacks to build your app
- **Solution**: Verify all dependencies are in `package.json` and `railway.json` is correctly configured

#### 3. Migration Failures
- **Check Logs**: Look at Railway deployment logs
- **Manual Migration**: If needed, run: `railway run npm run migrate`

#### 4. Environment Variables
- **Verify**: All required environment variables are set in Railway
- **Case Sensitivity**: Environment variable names are case-sensitive

### Railway CLI Commands (Optional)

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Link to existing project
railway link

# View variables
railway variables

# View logs
railway logs

# Run commands in Railway environment
railway run npm run migrate
```

## 🔧 Configuration Files Used

### railway.json
```json
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm run migrate && npm run start:production"
  }
}
```

### package.json Scripts
- **start:production**: `node ./bin/www` (production server)
- **migrate**: Runs all SQL migrations in order

## 📊 Monitoring & Maintenance

### Railway Dashboard
- **Logs**: Monitor deployment and runtime logs
- **Metrics**: CPU, memory, and bandwidth usage
- **Variables**: Manage environment variables
- **Databases**: PostgreSQL management and monitoring

### Health Checks
Railway performs automatic health checks on your `/health` endpoint.

## 🔒 Security Considerations

1. **JWT_SECRET**: Use a strong, random string (generate with `openssl rand -base64 32`)
2. **Environment Variables**: Never commit sensitive data to GitHub
3. **Database Security**: Railway's PostgreSQL is secure by default
4. **Rate Limiting**: Already configured in your Express app
5. **CORS**: Restrict to your frontend domain in production

## 📞 Support

If you encounter issues:
1. Check Railway documentation: https://docs.railway.app/
2. Review deployment logs in Railway dashboard
3. Verify all configuration files are correct
4. Test locally before deploying

## 🎉 Success Checklist

- [ ] Railway project created
- [ ] GitHub repository connected
- [ ] Environment variables configured
- [ ] Database PostgreSQL provisioned
- [ ] Backend deployed successfully
- [ ] Migrations ran without errors
- [ ] Health check endpoint responds
- [ ] API endpoints accessible
- [ ] Frontend can connect to backend

Your IMAN MCS Backend is now live on Railway! 🚀
