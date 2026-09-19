# LARPer

LARPer is a consumer discovery product for finding what niche communities are currently obsessed with and understanding the lore behind it.

This repository contains Part 1: the Discovery foundation. It uses normalized seed content and local preferences, with no live ingestion, authentication, or AI features.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Quality checks

```bash
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
```

Playwright needs Chromium once per machine:

```bash
npx playwright install chromium
```

## Project map

- `src/domain/discovery`: domain contracts, ranking, and page view-model services.
- `src/data/seed`: development dataset, integrity validation, and repository adapter.
- `src/components`: editorial discovery UI, preference state, and site shell.
- `src/app`: Discovery, topic detail, and niche routes.
- `public/media`: local generated editorial artwork used by the seed dataset.
- `docs/architecture/discovery.md`: architecture and future ingestion seam.

