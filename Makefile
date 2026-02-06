.PHONY: pm2 pm2-prod pm2-frontend pm2-backend pm2-stop pm2-kill pm2-logs pm2-logs-frontend pm2-logs-backend pm2-status
.PHONY: build build-frontend build-backend
.PHONY: sync-data upgrade-strapi act-lighthouse act-claude lighthouse

PM2 = npx pm2

# ─── PM2 Dev Orchestration ───────────────────────────────────────────

# Start frontend + backend against local Strapi
pm2:
	cp frontend/.dev.vars.local frontend/.dev.vars
	$(PM2) startOrRestart ecosystem.config.js

# Start frontend against production Strapi (no local backend needed)
pm2-prod:
	cp frontend/.dev.vars.prod frontend/.dev.vars
	$(PM2) startOrRestart ecosystem.config.js --only frontend

# Start/restart just frontend
pm2-frontend:
	$(PM2) startOrRestart ecosystem.config.js --only frontend

# Start/restart just backend
pm2-backend:
	$(PM2) startOrRestart ecosystem.config.js --only backend

# Stop all PM2 processes
pm2-stop:
	$(PM2) stop all

# Kill PM2 daemon and all processes
pm2-kill:
	$(PM2) kill

# Tail all logs
pm2-logs:
	$(PM2) logs

# Tail frontend logs
pm2-logs-frontend:
	$(PM2) logs frontend

# Tail backend logs
pm2-logs-backend:
	$(PM2) logs backend

# Show PM2 process table
pm2-status:
	$(PM2) status

# ─── Build ───────────────────────────────────────────────────────────

# Build frontend + backend
build: build-frontend build-backend

# Build frontend against production Strapi
build-frontend:
	cd frontend && STRAPI_API_URL=https://journal.hillpeople.net npm run build

# Build backend (install plugin deps first)
build-backend:
	cd backend/src/plugins/mp-sync-helper && npm install
	cd backend/src/plugins/newsletter && npm install
	cd backend && npm run build

# ─── Utilities ───────────────────────────────────────────────────────

# Sync local Strapi data from production
sync-data:
	cd backend && npm run transfer

# Upgrade Strapi to latest version
upgrade-strapi:
	cd backend && npx @strapi/upgrade minor

# Local GitHub Actions testing (requires gh act extension)
act-lighthouse:
	gh act pull_request -W .github/workflows/lighthouse.yml

act-claude:
	gh act pull_request -W .github/workflows/claude-review.yml

# Run Lighthouse CI locally
lighthouse:
	cd frontend && STRAPI_API_URL=https://journal.hillpeople.net npm run build
	npx @lhci/cli autorun
