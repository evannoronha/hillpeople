.PHONY: dev dev-prod sync-data backend upgrade-strapi act-lighthouse act-claude lighthouse

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

# Upgrade Strapi to latest version
upgrade-strapi:
	cd backend && npx @strapi/upgrade minor

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
