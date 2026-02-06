.PHONY: dev dev-prod sync-data backend upgrade-strapi build build-frontend build-backend newsletter-dev newsletter-deploy newsletter-send newsletter-send-to newsletter-send-posts newsletter-send-force newsletter-godmode-send act-lighthouse act-claude lighthouse

# Run frontend against local Strapi (http://localhost:1337)
dev:
	cp frontend/.dev.vars.local frontend/.dev.vars
	cd frontend && npm run dev

# Run frontend against production Strapi
dev-prod:
	cp frontend/.dev.vars.prod frontend/.dev.vars
	cd frontend && npm run dev

# Sync local Strapi data from production (requires STRAPI_PRODUCTION_URL and STRAPI_TRANSFER_TOKEN in backend/.env)
sync-data:
	cd backend && npm run transfer

# Run local Strapi backend
backend:
	cd backend && npm run develop

# Build everything (frontend + backend)
build: build-frontend build-backend

# Build frontend against production Strapi
build-frontend:
	cd frontend && STRAPI_API_URL=https://journal.hillpeople.net npm run build

# Build backend (plugins + admin panel)
build-backend:
	cd backend/src/plugins/mp-sync-helper && npm install
	cd backend && npm run build

# Upgrade Strapi to latest version
upgrade-strapi:
	cd backend && npx @strapi/upgrade minor

# Newsletter Worker commands
newsletter-dev:
	cd newsletter-worker && npm run dev

newsletter-deploy:
	cd newsletter-worker && npm run deploy

# Trigger newsletter manually (sends eligible posts to all subscribers)
newsletter-send:
	curl -X POST https://hillpeople-newsletter.evannoronha.workers.dev/trigger-newsletter

# Send to specific email only
newsletter-send-to:
	@test -n "$(TO)" || (echo "Usage: make newsletter-send-to TO=email@example.com" && exit 1)
	curl -X POST https://hillpeople-newsletter.evannoronha.workers.dev/trigger-newsletter -H "Content-Type: application/json" -d '{"to": "$(TO)"}'

# Send specific posts only
newsletter-send-posts:
	@test -n "$(POSTS)" || (echo "Usage: make newsletter-send-posts POSTS=1,2,3" && exit 1)
	curl -X POST https://hillpeople-newsletter.evannoronha.workers.dev/trigger-newsletter -H "Content-Type: application/json" -d '{"posts": [$(POSTS)]}'

# Override both recipient and posts
newsletter-send-force:
	@test -n "$(TO)" || (echo "Usage: make newsletter-send-force TO=email POSTS=1,2,3" && exit 1)
	@test -n "$(POSTS)" || (echo "Usage: make newsletter-send-force TO=email POSTS=1,2,3" && exit 1)
	curl -X POST https://hillpeople-newsletter.evannoronha.workers.dev/trigger-newsletter -H "Content-Type: application/json" -d '{"to": "$(TO)", "posts": [$(POSTS)]}'

# Godmode: bypass all filters (updatedAt, newsletterSent), requires GODMODE_TOKEN env var
# Posts will NOT be marked as sent. Accepts post slugs (not IDs).
newsletter-godmode-send:
	@test -n "$(SLUGS)" || (echo "Usage: make newsletter-godmode-send SLUGS=slug1,slug2 [TO=email]" && exit 1)
	@test -n "$$GODMODE_TOKEN" || (echo "Error: GODMODE_TOKEN env var is required" && exit 1)
	@slugs_json=$$(echo '$(SLUGS)' | sed 's/,/","/g' | sed 's/^/["/;s/$$/"]/')  && \
	if [ -n "$(TO)" ]; then \
		curl -X POST https://hillpeople-newsletter.evannoronha.workers.dev/godmode \
			-H "Content-Type: application/json" \
			-H "Authorization: Bearer $$GODMODE_TOKEN" \
			-d "{\"slugs\": $$slugs_json, \"to\": \"$(TO)\"}"; \
	else \
		curl -X POST https://hillpeople-newsletter.evannoronha.workers.dev/godmode \
			-H "Content-Type: application/json" \
			-H "Authorization: Bearer $$GODMODE_TOKEN" \
			-d "{\"slugs\": $$slugs_json}"; \
	fi

# Local GitHub Actions testing (requires gh act extension)
act-lighthouse:
	gh act pull_request -W .github/workflows/lighthouse.yml

act-claude:
	gh act pull_request -W .github/workflows/claude-review.yml

# Run Lighthouse CI locally
# Prerequisites:
#   1. Copy frontend/.dev.vars.example to frontend/.dev.vars
#   2. Fill in STRAPI_API_TOKEN in .dev.vars
#   3. Chrome must be installed
lighthouse:
	cd frontend && STRAPI_API_URL=https://journal.hillpeople.net npm run build
	npx @lhci/cli autorun
