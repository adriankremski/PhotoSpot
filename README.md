# PhotoSpot

> Discover & share picturesque photo locations effortlessly.

---

## Table of Contents
1. [Project Description](#project-description)
2. [Tech Stack](#tech-stack)
3. [Getting Started Locally](#getting-started-locally)
4. [Available Scripts](#available-scripts)
5. [Project Scope](#project-scope)
6. [Project Status](#project-status)
7. [License](#license)

---

## Project Description
PhotoSpot is a web application that helps photographers and photography enthusiasts quickly find scenic photo spots and share their own shots. The app combines an interactive map with a synchronized photo gallery, providing both inspiration and practical location details. Key features include:

- Account system with roles (Photographer / Enthusiast)
- Interactive Mapbox map with clustering & lazy-loading markers
- Synchronised thumbnail strip for photos currently in view
- Advanced filters (category, daylight, season, author role)
- Photo upload with EXIF location detection or manual pin-drop
- Privacy-friendly location blur (100-500 m)
- User profiles and private favourites list
- Unique URLs for photos (`/photo/[id]`) and users (`/user/[id]`)
- Content moderation & reporting system

---

## Tech Stack
| Layer            | Technology |
|------------------|------------|
| Front-End        | **Astro 5** (Islands architecture), **React 19**, **TypeScript 5** |
| Styling & UI     | **Tailwind CSS 4**, **shadcn/ui** (Radix + Tailwind), **Lucide-React** icons |
| Back-End & Data  | **Supabase** (PostgreSQL, Auth, Storage, Edge Functions) with Row-Level Security |
| Mapping          | **Mapbox GL JS / Tiles** (clustering, geocoding) |
| DevOps / Hosting | **Vercel** (zero-config deploy, global CDN), **GitHub Actions** (CI), **Sentry** (error monitoring) |
| Tooling          | **ESLint**, **Prettier**, **Husky** + **lint-staged** |
| Runtime          | **Node 22.14.0** (see `.nvmrc`) |

---

## Getting Started Locally
### Prerequisites
- **Node 22.14.0** & **npm 10+** (or use `nvm install` to match `.nvmrc`)
- **pnpm** or **yarn** can also be used if preferred (update commands accordingly)

### Installation
```bash
# Clone the repo
git clone https://github.com/your-org/photospot.git
cd photospot

# Install dependencies
npm install
```

### Environment Variables
Create a `.env` file (or use Vercel project vars) with the following keys:
```env
# Public variables (exposed to client)
PUBLIC_SUPABASE_URL=your-supabase-url
PUBLIC_SUPABASE_KEY=your-anon-key

# Server-only variables (never exposed to client)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Optional
NEXT_PUBLIC_MAPBOX_TOKEN=your-mapbox-token
```
> For a full list of variables see `src/env.d.ts`.

### Running the app
```bash
# Start Astro development server (http://localhost:4321)
npm run dev
```

### Building for production
```bash
npm run build
npm run preview   # Local preview of the static build
```

---

## Available Scripts
Command            | Description
-------------------|-----------------------------------------------------------
`npm run dev`      | Launches Astro in development mode with hot reload.
`npm run build`    | Generates a static production build.
`npm run preview`  | Serves the built site for local preview.
`npm run astro`    | Exposes the Astro CLI.
`npm run lint`     | Runs ESLint.
`npm run lint:fix` | Runs ESLint with automatic fixes.
`npm run format`   | Formats files with Prettier.

---

## Project Scope
The MVP purposefully excludes payments, subscriptions, chat, follows, collections, bulk-upload and offline mode. Manual moderation, minimal legal compliance (cookies consent & GDPR checkbox) and limited automated testing are in place for the initial release. See [`docs/prd.md`](./.ai/prd.md) for full functional requirements.

---

## Project Status
🚧 **In active development – MVP milestone**

Key success metrics once live:
- 100 registered users in the first month
- ≥ 300 photos uploaded within 60 days
- Map load time < 2 s (p90)

Track progress in the [issue tracker](https://github.com/your-org/photospot/issues).

---

## License
This project is licensed under the **MIT License** – see the [LICENSE](LICENSE) file for details.

