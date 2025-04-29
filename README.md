# Hill People: Evan and Morgan's notes from along the way

This repo is the source for my parter and I's blog. The frontend client is hosted by Cloudflare at http://hillpeople.net, and the "backend" API service is an instance of Strapi hosted by Strapi Cloud.

The frontend app fetches data from the API and renders content via SSR. By and large, the API layer is independent of the client, however it does render the client in an iframe for an authoring "preview mode." This is the setup that Strapi recommends, although the bidirectional request flow is a bit weird.

## Frontend

The frontend is written using Astro JS and runs on Cloudflare using the astro-cloudflare-adapter. See `./frontend/README.md` for more.

## Backend

The backend is a Strapi instance created using `create-strapi-app`. See `./backend/README.md` for more info.

## Deployment

Deployment is totally outside the scope of this repo. Cloudflare and Strapi cloud respectively monitor this repo for changes to main, and automatically build and deploy new versions when we merge changes to main.

