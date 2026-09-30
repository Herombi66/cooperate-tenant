# 🚀 Deploying Cooperative Multi-Tenant Application to Your DigitalOcean Droplet

This guide provides the exact steps to deploy the **Cooperative Multi-Tenant Application** onto your existing DigitalOcean Ubuntu Droplet.

---

## 🏗️ Architecture on Your Droplet

The application runs as 3 containerized services orchestrated by **Docker Compose**:

| Container | Image / Tech | Ports | Description |
| :--- | :--- | :--- | :--- |
| **`cooperative_frontend`** | React (Vite) + Nginx Alpine | **80**, **443** | Serves the frontend SPA and acts as reverse proxy for `/api/*`, `/uploads/*`, and `/socket.io/*`. |
| **`cooperative_backend`** | Node.js 20 Alpine (Express) | **3001** | Runs Sequelize with auto-migrations on startup, handles business logic, auth, and multi-tenancy. |
| **`cooperative_postgres`** | PostgreSQL 15 Alpine | **5432** (Localhost) | Secure relational database with persistent storage (`cooperative_postgres_data` volume). |

---

## 📋 Step-by-Step Deployment Instructions

### Step 1: Connect to Your Droplet via SSH

Open your local terminal (PowerShell, Command Prompt, or Git Bash) and run:

```bash
ssh root@YOUR_DROPLET_IP
```
*(Replace `YOUR_DROPLET_IP` with the IPv4 address of your Droplet from the DigitalOcean dashboard).*

---

### Step 2: Clone Your Repository

On the Droplet, clone the project into `/var/www/cooperative-tenant`:

```bash
mkdir -p /var/www
cd /var/www
git clone https://github.com/Herombi66/cooperate-tenant.git cooperative-tenant
cd cooperative-tenant
```

> **Note**: If your repository is private, you can authenticate using a GitHub Personal Access Token or add the Droplet's SSH key (`cat ~/.ssh/id_rsa.pub`) to your GitHub account.

---

### Step 3: Run the Automated Droplet Setup Script

We provided a setup script that automatically installs Docker, configures 2GB of swap memory (to prevent memory exhaustion), and configures the firewall:

```bash
chmod +x setup-droplet.sh setup-ssl.sh backend/docker-entrypoint.sh
sudo ./setup-droplet.sh
```

---

### Step 4: Configure Production Environment Variables

1. Copy the production environment template:
   ```bash
   cp .env.production.example .env
   ```

2. Generate a secure 32-character JWT secret:
   ```bash
   openssl rand -hex 32
   ```

3. Open `.env` in the text editor:
   ```bash
   nano .env
   ```

4. Configure the following key variables:
   ```env
   NODE_ENV=production
   PORT=3001

   # Set to your Droplet IP (or your custom domain if you have one)
   APP_URL=http://YOUR_DROPLET_IP
   FRONTEND_URL=http://YOUR_DROPLET_IP
   CORS_ORIGINS=http://YOUR_DROPLET_IP,http://YOUR_DROPLET_IP:3001

   # Choose a strong password for PostgreSQL
   DB_USER=postgres
   DB_PASSWORD=YourStrongDatabasePasswordHere
   DB_NAME=imanmcs_db

   # Paste the generated JWT secret from step 2
   JWT_SECRET=your_generated_random_secret_here

   # Keep this as /api (handled by Nginx reverse proxy)
   VITE_API_URL=/api
   ```

   *Save and exit in nano: Press `Ctrl + O`, then `Enter`, then `Ctrl + X`.*

---

### Step 5: Build and Start the Application

Run the following command to build the Docker images and start all 3 services in the background:

```bash
docker compose up -d --build
```

Docker will:
1. Start PostgreSQL and wait until its healthcheck passes.
2. Run database migrations via `wait-for-db.js`.
3. Start the Express backend on port 3001.
4. Build the Vite production bundle and launch Nginx on port 80.

---

### Step 6: Verify Deployment

1. **Check running containers**:
   ```bash
   docker compose ps
   ```
   All 3 containers (`cooperative_postgres`, `cooperative_backend`, `cooperative_frontend`) should show status `Up` or `Up (healthy)`.

2. **Check backend logs**:
   ```bash
   docker compose logs -f backend
   ```
   You should see:
   ```text
   ✅ Database connection established successfully!
   🎉 All migrations completed successfully!
   ✅ Startup DB Repair completed.
   Listening on port 3001
   ```
   *(Press `Ctrl + C` to exit logs).*

3. **Test health endpoint**:
   ```bash
   curl http://localhost/health
   # or
   curl http://localhost:3001/health
   ```

4. **Open in browser**:
   Visit `http://YOUR_DROPLET_IP` in your web browser. You should see the **Cooperative Multi-Tenant Application** login and landing page.

---

### Step 7: (Optional) Connect Custom Domain & Enable Free SSL (HTTPS)

If you have a domain (e.g. `cooperative.yourdomain.com` or `yourdomain.com`):

1. **Point DNS**: In your domain registrar (GoDaddy, Namecheap, Cloudflare, etc.), add an **A Record**:
   - **Host / Name**: `@` (or subdomain like `app`)
   - **Points to / Value**: `YOUR_DROPLET_IP`
   - Wait 2–5 minutes for DNS propagation.

2. **Run the SSL automation script**:
   ```bash
   sudo ./setup-ssl.sh yourdomain.com your-email@example.com
   ```

This will automatically obtain a Let's Encrypt SSL certificate, update Nginx with HTTP-to-HTTPS redirect, and activate SSL.

---

## 🛠️ Handy Operations & Maintenance Commands

### How to update code in the future:
When you push code updates to GitHub:
```bash
cd /var/www/cooperative-tenant
git pull origin main
docker compose up -d --build
```

### View container logs:
```bash
# View backend logs
docker compose logs -f backend

# View frontend / Nginx access and error logs
docker compose logs -f frontend

# View database logs
docker compose logs -f postgres
```

### Restart all containers:
```bash
docker compose restart
```

### Database Backups:
Create an instant SQL dump of the database:
```bash
docker exec -t cooperative_postgres pg_dump -U postgres imanmcs_db > ~/backup_$(date +%F_%T).sql
```

### Database Restore:
```bash
cat backup_file.sql | docker exec -i cooperative_postgres psql -U postgres imanmcs_db
```
