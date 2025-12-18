# Docker Deployment Guide

This guide covers using Docker to deploy your Music Leek Discord bot.

## What is Docker?

Docker packages your application and all its dependencies into a "container" - a lightweight, standalone package that runs consistently everywhere. Think of it as a portable box containing everything needed to run your bot.

### Benefits
- **Consistency**: Works the same on your machine, servers, and cloud platforms
- **Isolation**: Doesn't interfere with other applications
- **Portability**: Easy to move between different hosting platforms
- **Easy Updates**: Rebuild and redeploy with a single command

---

## Quick Start

### 1. Install Docker

**Windows:**
- Download [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop)
- Install and restart your computer
- Verify: `docker --version`

**Mac:**
- Download [Docker Desktop for Mac](https://www.docker.com/products/docker-desktop)
- Install and start Docker Desktop
- Verify: `docker --version`

**Linux:**
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
# Log out and back in
docker --version
```

### 2. Build Your Docker Image

```bash
# Navigate to your project directory
cd music-leek

# Build the Docker image
docker build -t music-leek:latest .
```

This creates a Docker image named `music-leek` with the tag `latest`.

### 3. Run Your Bot in Docker

**Option A: Using docker run command**

```bash
docker run -d \
  --name music-leek-bot \
  --restart unless-stopped \
  -e DISCORD_TOKEN="your_token_here" \
  -e DISCORD_CLIENT_ID="your_client_id_here" \
  -v $(pwd)/data:/app/data \
  music-leek:latest
```

**Option B: Using docker-compose (Recommended)**

Create a `.env` file in your project root:
```
DISCORD_TOKEN=your_token_here
DISCORD_CLIENT_ID=your_client_id_here
```

Then run:
```bash
docker-compose up -d
```

---

## Docker Commands Reference

### Managing Your Bot

```bash
# Start bot
docker-compose up -d

# Stop bot
docker-compose down

# Restart bot
docker-compose restart

# View logs
docker-compose logs -f

# View last 100 log lines
docker-compose logs --tail=100

# Check if bot is running
docker-compose ps
```

### Updating Your Bot

```bash
# After making code changes:
git pull  # If using git
docker-compose build  # Rebuild image
docker-compose up -d  # Restart with new image
```

### Manual Docker Commands (without docker-compose)

```bash
# Build image
docker build -t music-leek:latest .

# Run container
docker run -d --name music-leek-bot music-leek:latest

# Stop container
docker stop music-leek-bot

# Start container
docker start music-leek-bot

# Remove container
docker rm music-leek-bot

# View logs
docker logs -f music-leek-bot

# Execute command in container
docker exec -it music-leek-bot sh

# View container stats (CPU, memory)
docker stats music-leek-bot
```

---

## Understanding the Dockerfile

Let's break down what each part does:

```dockerfile
# Base image: Node.js 20 on Alpine Linux (small and efficient)
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files (done first for better caching)
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Copy source code
COPY tsconfig.json ./
COPY src ./src

# Install dev dependencies temporarily (needed for build)
RUN npm install --only=development

# Build TypeScript to JavaScript
RUN npm run build

# Remove dev dependencies (reduces final image size)
RUN npm prune --production

# Create data directory
RUN mkdir -p /app/data

# Set environment
ENV NODE_ENV=production

# Run as non-root user (security best practice)
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

# Start the bot
CMD ["node", "dist/index.js"]
```

### Why This Structure?

1. **Layer Caching**: `package*.json` copied first means Docker can reuse cached dependencies if code changes but dependencies don't
2. **Multi-stage Build**: Install dev deps → build → remove dev deps = smaller final image
3. **Security**: Running as non-root user prevents potential security issues
4. **Alpine Linux**: Lightweight base image (~5MB vs ~100MB for full Linux)

---

## Data Persistence

### Understanding Volumes

Docker containers are ephemeral (temporary). When you delete a container, its data is lost unless you use volumes.

The line in `docker-compose.yml`:
```yaml
volumes:
  - ./data:/app/data
```

This maps the `data/` folder on your computer to `/app/data` inside the container, so league data persists even if you rebuild the container.

### Managing Data

```bash
# Backup league data
cp -r data/ data-backup-$(date +%Y%m%d)/

# Restore league data
cp -r data-backup-20250118/ data/

# View data files
ls -la data/

# Copy data from container (if needed)
docker cp music-leek-bot:/app/data ./data-backup
```

---

## Troubleshooting

### Bot Won't Start

```bash
# Check logs for errors
docker-compose logs

# Common issues:
# 1. Missing environment variables
#    → Check .env file exists and has correct values
# 2. Port already in use
#    → Change port in docker-compose.yml or stop other container
# 3. Build errors
#    → Check Dockerfile and src/ files
```

### Image Build Fails

```bash
# Clean Docker cache and rebuild
docker-compose build --no-cache

# Check disk space
docker system df

# Clean up old images/containers
docker system prune -a
```

### Container Crashes

```bash
# View exit code
docker-compose ps

# View logs
docker-compose logs --tail=200

# Run container interactively to debug
docker run -it --rm music-leek:latest sh
```

---

## Next Steps

1. Test locally: `docker-compose up`
2. Check logs: `docker-compose logs -f`
3. If working, deploy to production (see [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md))
4. Set up monitoring and alerts
5. Create backup routine for `data/` folder
