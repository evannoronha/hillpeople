# Hill People: Evan and Morgan's notes from along the way

This repo defines the data source (API) and frontend view logic for a blog.

# Frontend

# Backend

# Deployment

# Strapi -> Astro Intration
The production strapi instance is the source of truth our data shape and content. Before doing any work in the backend folder:

```sh
git checkout main
git pull
cd backend
npx strapi transfer --from https://journal.hillpeople.net/admin
```
