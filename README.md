# Sprout Tech

A React, TypeScript, and Vite site for the Sprout Tech digital studio.

## Local development

```bash
npm install
npm run dev
```

Create a production build with `npm run build`.

## Deploy to Render

This repository includes a `render.yaml` Blueprint for a Render Static Site.
In Render, choose **New → Blueprint**, connect this GitHub repository, and
deploy the detected `render.yaml`. Render will build the `main` branch with
`npm ci && npm run build` and publish the `dist` directory.
