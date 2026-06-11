# Repository Guidelines

## Project Overview

**CattleGen** — Web and desktop application for managing genetic crossbreeding of beef cattle (Nelore/Zebu). Supports animal registration, genetic evaluations (DEPs) from three programs (Geneplus, PMGZ, ANCP), genealogy tracking, photo upload, a mating simulator with a scoring engine, and an AI-powered assistant for interpreting DEPs and suggesting matings.

**Stack:** React 19 + TypeScript ~6.0 + Vite 8 + Tailwind CSS 4 + react-router-dom 7 + Supabase (PostgreSQL/Auth/Storage/vector). Desktop packaging via Electron 42 + electron-builder 26 (Windows `.exe` installer + portable).

---

## Architecture & Data Flow

```
Browser / Electron Window
    → React Router (BrowserRouter)
        → MainLayout (sidebar + content area)
            → Pages / Features
                → Components (common, layout)
                → Hooks (useChat, useChatHistory)
                → Services (ollamaClient, supabaseAiClient)
                → Lib (supabase singleton, scoring engine)
                → Types (central domain types)
    → Supabase Client (REST/WebSocket)
        → Supabase Cloud (PostgreSQL + Auth + Storage + pgvector)
    → Ollama Proxy (Vite dev only, /ollama → localhost:11434)
```

**Key principle:** No backend server of our own. All data operations go through the Supabase client directly from the frontend. Row Level Security (RLS) is enabled on all tables in migrations, but currently set to permissive for the MVP. The scoring engine (`src/lib/scoring.ts`) is pure TypeScript with zero UI or database dependencies.

---

## Key Directories

| Directory | Purpose |
|---|---|
| `src/features/` | Domain feature modules: `animals/` (CRUD, details, import, observations), `evaluations/` (assessment forms), `simulator/` (mating wizard), `assistant/` (AI chat) |
| `src/pages/` | Top-level page shells: `Dashboard.tsx`, `Reports.tsx`, `Config.tsx` |
| `src/components/` | Shared UI: `layout/` (MainLayout, Sidebar), `common/` (ImageUpload) |
| `src/hooks/` | Reusable React hooks: `useChat.ts` (streaming logic), `useChatHistory.ts` (localStorage persistence) |
| `src/services/` | External API clients: `ollamaClient.ts` (Ollama/OpenAI-compatible SSE streaming), `supabaseAiClient.ts` (Supabase Edge Function wrapper) |
| `src/lib/` | Core utilities: `supabase.ts` (singleton client), `scoring.ts` (pure mating engine) |
| `src/types/` | Central domain types mirroring the Supabase schema |
| `supabase/` | CLI config (`config.toml`), migrations (`migrations/`), seed SQL (`seed.sql`, `init_db.sql`) |
| `electron/` | Desktop packaging: `main.cjs` (main process), `preload.cjs` (context bridge) |
| `build/` | NSIS installer custom scripts (`installer.nsh`) |
| `release/` | Electron build output: installer `.exe`, portable `.exe`, unpacked dir |
| `scripts/` | Seed scripts (`seed_carbono.cjs`) |

---

## Development Commands

```bash
# Web dev server (Vite proxy for Ollama active)
npm run dev

# Production build (passes tsc + vite build)
npm run build

# Lint only
npm run lint

# Electron dev (spawns Vite + Electron together)
npm run electron:dev

# Package Electron app (unpacked, for testing)
npm run electron:pack

# Build Windows installer (.exe) + portable .exe
npm run electron:build
```

**Build output:**
- Web: `dist/`
- Electron unpacked: `release/win-unpacked/`
- Installer: `release/CattleGen Setup X.X.X.exe` (NSIS, automatic uninstaller)
- Portable: `release/CattleGen X.X.X.exe`

---

## Code Conventions & Common Patterns

### Imports & Paths
- **No path aliases** (`@/`). Use relative paths: `../../lib/supabase`, `../types`.
- `src/lib/` for singletons and pure utilities.
- `src/services/` for external API wrappers.

### Component Structure
- Functional components, mostly explicit `React.FC` or default exports.
- Local state via `useState`; side effects via `useEffect`.
- Data fetching directly from Supabase in `useEffect` (no React Query / SWR layer).
- Form components use `useNavigate` + `useParams` to detect edit mode (`isEdit = !!id`).

### Types & TypeScript Discipline
- All domain types live in `src/types/index.ts` and mirror the Supabase schema.
- **Strict flags enabled:** `noUnusedLocals`, `noUnusedParameters`, `verbatimModuleSyntax`.
- Never use `any` or `as any`. Use `unknown`, domain types, type guards, or `satisfies`.
- Never use `ReturnType<typeof fn>`. Export named interfaces at the owning module.
- Use `Record<K, V>` for static lookups; `Set`/`Map` for dynamic runtime collections.

### State Management
- **Local React state only.** No Redux, Zustand, or Context API.
- Chat history persists to `localStorage` under `cattlegen_chat_sessions`.
- Theme toggle persists to `localStorage` (`cattlegen-theme` key) and toggles `.dark` on `<html>`.

### Error Handling
- Supabase errors caught and logged to console; user-facing messages via `sonner` toasts.
- AI assistant streams responses; connection errors surfaced in the chat UI.

### Async Patterns
- `async/await` inside `useEffect` with cleanup flags (`cancelled` boolean) to prevent state updates after unmount.
- `AbortController` stored in `useRef` for cancellable streaming requests.

### Styling
- Tailwind CSS v4 with `@tailwindcss/vite` plugin.
- No separate `tailwind.config.js`; customization via `@theme` in `src/index.css`.
- Dark-first theme: `neutral-900` backgrounds, `emerald-600` accents, `gray-100` text.
- Responsive sidebar: off-canvas hamburger on mobile (`md:hidden`, `md:flex`).

---

## Important Files

| File | Role |
|---|---|
| `src/main.tsx` | React app bootstrap (StrictMode) |
| `src/App.tsx` | Router definition + route-to-component mapping |
| `src/lib/supabase.ts` | Singleton Supabase client; reads `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` |
| `src/lib/scoring.ts` | Pure mating engine: normalization, expected progeny values, composite scores, alerts. Zero deps. |
| `src/services/ollamaClient.ts` | OpenAI-compatible SSE streaming client for Ollama. No SDK, no API key in frontend. |
| `vite.config.ts` | Vite plugins (React, Tailwind); proxy `/ollama` → `localhost:11434`; `base: './'` for Electron |
| `package.json` | Scripts + Electron Builder config (`build` field) |
| `electron/main.cjs` | Electron main process: loads `dist/index.html` (prod) or `localhost:5173` (dev) |
| `supabase/migrations/20260610000000_ddl.sql` | Core schema DDL (9 tables + enums) |
| `supabase/migrations/20260611000001_ai_schema.sql` | pgvector extension, `dep_embedding`, `knowledge_base`, HNSW indexes |
| `.env.local` | **Gitignored.** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_OLLAMA_BASE_URL`, `VITE_OLLAMA_MODEL` |

---

## Runtime/Tooling Preferences

- **Runtime:** Node.js v26+ (observed in environment). npm 11+.
- **Package manager:** npm.
- **OS:** Windows 11 + PowerShell. Bash-style scripts (`&`, `sleep`) do **not** work.
- **Vite proxy:** `/ollama` only works in `npm run dev`. In production, Ollama is unreachable unless a remote backend is added.
- **Electron builder targets:** `nsis` (installer + uninstaller) + `portable`, arch `x64`.

---

## Testing & QA

- **No test framework currently configured.** No Jest, Vitest, Playwright, or Cypress.
- No `*.test.ts`, `*.spec.ts`, or `__tests__/` directories exist.
- `npm run lint` runs ESLint (flat config: `@eslint/js`, `typescript-eslint`, `react-hooks`, `react-refresh`).
- `npm run build` runs `tsc -b && vite build`. TypeScript build must pass clean.
- **Quality gate:** `tsc -b` must pass with zero errors.

---

## Domain Context for AI Assistants

- **Animal sexo:** `M` (bull) or `F` (cow). UI splits into "Touros" and "Fêmeas" tabs but stores in one `animal` table.
- **Pedigree:** Stored in `animal_relation` with `relation_type: 'PAI' | 'MAE' | 'AVO_MATERNO'`. Links via `related_animal_id` or free-text `related_name`.
- **Evaluations:** One row per `evaluation` (program + edition + date). Traits stored in `evaluation_trait` with the **original program code** (e.g., `AOLg`). `trait_dictionary` maps canonical concepts (`AOL`) to program-specific codes.
- **Scoring engine:** Expects `Map<string, EvaluationTrait>` keyed by program-specific `code`. `Simulator` loads the latest evaluation per animal + program, builds these maps, and calls `calcularCruzamento()`.
- **AI Assistant:** Uses Ollama with a custom zootecnista system prompt. Streaming fetch (no SDK). Only works when Ollama daemon is running locally.
- **Vector / RAG:** `animal.dep_embedding vector(1024)` and `knowledge_base` table with HNSW indexes for semantic search.
- **Supabase Storage:** Bucket `animal-photos` must be created manually in the Supabase dashboard (public bucket + INSERT policy for anon key).

---

## Known Blockers / Operational Notes

1. **Supabase Storage bucket `animal-photos` does not exist.** Upload fails until created manually in Supabase dashboard (public bucket + INSERT policy for anon key).
2. **Vercel deploy not configured.** Code is on GitHub branch `main-` (note trailing dash). Requires manual import at `vercel.com/new` + env vars.
3. **Ollama proxy only in dev.** Assistant breaks in production builds unless a remote LLM backend is wired up.
4. **No females in DB yet.** Simulator renders visually but cannot run end-to-end calculations without a female with evaluation data.
5. **Electron build artifacts** are in `release/`. NSIS installer `.exe` and portable `.exe` generated by `npm run electron:build`.
