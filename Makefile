.PHONY: dev dev-prod sync-data backend migrate-ckeditor migrate-ckeditor-dry upgrade-strapi

# Run frontend against local Strapi (http://localhost:1337)
dev:
	cd frontend && STRAPI_API_URL=http://localhost:1337 npm run dev

# Run frontend against production Strapi
dev-prod:
	cd frontend && STRAPI_API_URL=https://journal.hillpeople.net npm run dev

# Sync local Strapi data from production (requires STRAPI_PRODUCTION_URL and STRAPI_TRANSFER_TOKEN in backend/.env)
sync-data:
	cd backend && npm run transfer

# Run local Strapi backend
backend:
	cd backend && npm run develop

# Migrate markdown content to CKEditor HTML (requires STRAPI_TOKEN env var)
migrate-ckeditor:
	cd backend && npx tsx scripts/migrate-richtext-to-ckeditor.ts

# Preview migration output without writing (requires STRAPI_TOKEN env var)
migrate-ckeditor-dry:
	cd backend && npx tsx scripts/migrate-richtext-to-ckeditor.ts --dry-run

# Upgrade Strapi to latest version
upgrade-strapi:
	cd backend && npx @strapi/upgrade minor
