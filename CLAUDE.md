# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**CattleGen** — Desktop and web application for managing genetic crossbreeding of beef cattle (Nelore/Zebu). Dual-target: web (Vite) and desktop (Electron + electron-builder, Windows `.exe` installer + portable).

## Common Commands

```bash
# Web dev server (Vite proxy for Ollama active at /ollama)
npm run dev

# Production build (tsc -b && vite build)
npm run build

# Lint (ESLint flat config)
npm run lint

# Electron dev (spawns Vite + Electron together)
npm run electron:dev

# Package Electron app (unpacked, for testing)
npm run electron:pack

# Build Windows installer (.exe) + portable .exe
npm run electron:build
```

**No test framework is configured.** There is no `npm test` script, no Vitest/Jest/Playwright, and no `*.test.ts` files yet.

## High-Level Architecture

### Dual runtime
- **Web:** Vite dev server (`localhost:5173`) with `base: './'`. Proxy `/ollama` → `localhost:11434` (dev only; production web builds cannot reach Ollama).
- **Desktop:** Electron main process (`electron/main.cjs`) loads `dist/index.html` in production or `localhost:5173` in dev. Context isolation enabled, preload at `electron/preload.cjs`.
- **Build output:** `dist/` (web), `release/` (Electron installer + portable).
- **Vercel:** `vercel.json` configures SPA rewrite (`/(.*)` → `/index.html`) and `outputDirectory: dist`.

### No custom backend server
All data operations go through the Supabase JS client directly from the frontend. There is no Node/Express server in this repo.

### Frontend structure
- **Router:** `react-router-dom` v7 with `BrowserRouter`. Edit mode detected via `useParams` (`isEdit = !!id`) + `useNavigate`.
- **State:** Local React state only. No Redux, Zustand, or Context API. Chat history persists to `localStorage` under `cattlegen_chat_sessions`.
- **Styling:** Tailwind CSS v4 via `@tailwindcss/vite` plugin. Customization via `@theme` in `src/index.css`. No `tailwind.config.js`. Dark-first palette (`neutral-900`, `emerald-600`).
- **Data fetching:** Direct Supabase calls inside `useEffect` with cleanup booleans. No TanStack Query / SWR layer yet.

### Domain layering
```
src/pages/         — Top-level shells (Dashboard, Reports, Config)
src/features/    — Domain modules: animals/, evaluations/, simulator/, assistant/
src/components/  — Shared UI: layout/ (MainLayout, Sidebar), common/ (ImageUpload)
src/hooks/       — Reusable hooks: useChat.ts, useChatHistory.ts
src/services/    — External API clients: ollamaClient.ts, supabaseAiClient.ts
src/lib/         — Singletons and pure utilities: supabase.ts, scoring.ts
src/types/       — Central domain types mirroring the Supabase schema
```

### Pure scoring engine
`src/lib/scoring.ts` is a zero-dependency TypeScript engine that:
- Normalizes trait ranks (PERCENTIL / TOP / DECA / DEP raw) to a 0–100 scale
- Calculates expected progeny values from sire + dam traits
- Computes composite scores by profile (NOVILHAS / REPOSICAO / TERMINAL)
- Emits alerts (e.g., PN penalizes deviation from ~32 kg instead of “higher is better”)

It accepts `Map<string, EvaluationTrait>` keyed by **program-specific trait codes** (e.g., `AOLg`) and returns `CruzamentoResult`. The `Simulator` builds these maps from the latest evaluation per animal.

### AI Assistant — dual backend
The assistant in `src/features/assistant/Assistant.tsx` supports two backends, selected via UI:
1. **Supabase Edge Function** (`supabase/functions/ai-assistant/index.ts`): Non-streaming. Calls Voyage AI (`voyage-3`) for embedding + semantic search in `knowledge_base`, then calls Anthropic Claude API (`claude-3-5-sonnet-20241022` or `claude-3-5-haiku-20241022`). Requires env vars `VOYAGE_API_KEY` and `ANTHROPIC_API_KEY` in the Supabase project.
2. **Ollama local** (`src/services/ollamaClient.ts`): SSE streaming fetch to `/ollama/v1/chat/completions`. No SDK, no API key in frontend. Only works in `npm run dev` via the Vite proxy.

### Supabase schema notes
- **Trait normalization:** `trait_dictionary` maps canonical concepts (e.g., `AOL`) to program-specific codes used in `evaluation_trait`.
- **Evaluations:** One `evaluation` row per program + edition; traits live in `evaluation_trait`.
- **Pedigree:** `animal_relation` with `relation_type: 'PAI' | 'MAE' | 'AVO_MATERNO'`.
- **Vector/RAG:** `dep_embedding vector(1024)` and `knowledge_base` with HNSW indexes; `match_knowledge()` RPC.
- **Observation flag:** Migration `20260611000002_observation_list.sql` adds `is_observed boolean` to `animal` for catalog-imported animals.
- **Photos:** Supabase Storage bucket `animal-photos` must be created manually (public bucket + INSERT policy for anon key); it does not exist yet.

## Code Conventions (from AGENTS.md)

- **No path aliases** (`@/`). Use relative paths.
- **Never `any` or `as any`**. Use `unknown`, domain types, type guards, or `satisfies`.
- **Never `ReturnType<typeof fn>`**. Export named interfaces at the owning module.
- **Strict TypeScript flags:** `noUnusedLocals`, `noUnusedParameters`, `verbatimModuleSyntax`.
- Components are explicit `React.FC` or default exports.
- Supabase errors are caught and surfaced via `sonner` toasts.
- Async streaming uses `AbortController` stored in `useRef`.

## Critical Operational Notes

1. **Fictitious package versions in `package.json`:** `react ^19.2.6`, `vite ^8.0.12`, `typescript ~6.0.2`, `electron ^42.4.0`, `electron-builder ^26.15.2`, `@types/react ^19.2.14` do not exist in the npm registry. `npm install` on a fresh machine will fail until these are downgraded to real stable versions.
2. **RLS is active in migrations but has no policies.** Migrations `20260610000000_ddl.sql` run `alter table ... enable row level security` on all tables without creating any policies. If these migrations are applied to the Supabase project, the frontend (which uses only the anon key with no login UI) will receive empty arrays for every query. Do not apply migrations to production without first adding permissive policies or building Auth + RLS policies.
3. **Ollama proxy is dev-only.** The assistant fetches `/ollama/v1/...`, which only works via the Vite proxy. In production (Electron or Vercel) the assistant will break unless a remote LLM backend is wired up.
4. **Branch name:** The Git default branch is `main`. The current checkout may be on `main-` (trailing dash), which is an older branch. Use `main` for new work and PRs.
5. **No test suite.** `tsc -b` is the current quality gate.
6. **Edge Function `ai-assistant` env vars:** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `VOYAGE_API_KEY`, `ANTHROPIC_API_KEY` must be set in the Supabase dashboard for the Edge Function to work.
