# HANDOFF — CattleGen (app-cruzamento)

Documento de transferência para outro agente continuar. Última atualização: 2026-06-10.

## 1. O que é o projeto

App web de **gestão de cruzamento de bovinos de corte** (Nelore/zebuínos). Cadastro de
animais, avaliações genéticas (DEPs) de 3 programas (Geneplus, PMGZ, ANCP), genealogia,
upload de fotos, simulador de cruzamento com motor de scoring, e um assistente de IA
(chat) para interpretar DEPs / sugerir acasalamentos.

- **Pasta do app:** `f:\Download\touros fazenda\app-cruzamento`
- **Stack:** React 19 · Vite 8 · TypeScript 6 · Tailwind 4 · react-router-dom 7 · Supabase · Electron (desktop .exe)
- **Git:** branch **`main-`** (ATENÇÃO: tem um traço no fim, não é `main`). Remote:
  `https://github.com/avila2026/app-cruzamento-bovinos.git`. Último commit enviado: `8936152`.
- **Ambiente:** Windows 11, PowerShell. Node v26.2.0, npm 11.16. RAM 15.8 GB.
  Scripts npm estilo bash (`&`, `sleep`) NÃO funcionam aqui.
- **Rodar web:** `npm run dev` → http://localhost:5173 (proxy `/ollama` ativo). Build: `npm run build` (passa limpo).
- **Rodar desktop dev:** `npm run electron:dev`
- **Build desktop:** `npm run electron:build` → gera `release/CattleGen Setup 1.0.0.exe` (NSIS installer + uninstaller) e `release/CattleGen 1.0.0.exe` (portable).

## 2. Supabase

- Project ID: `pmxdmuquerfttwyinwis`. URL + anon key estão em `.env.local` (gitignored, NÃO versionar).
- RLS desativado para o MVP. Schema em `supabase/migrations/20260610000000_ddl.sql`.
- Tabelas-chave: `farm`, `animal`, `animal_relation` (PAI/MAE/AVO_MATERNO, texto via `related_name`),
  `evaluation`, `evaluation_trait` (code original do programa), `trait_dictionary`
  (mapeia conceito → `code_geneplus`/`code_pmgz`/`code_ancp`), `file_asset` (tipo FOTO), `mating`, `report`.
- Dados: 1 touro real "Carbono FIV da S.Nice" já carregado com DEPs dos 3 programas. **0 fêmeas cadastradas**.

## 3. O que JÁ está feito (commitado e no GitHub)

- **CRUD de animais completo + edição manual:** `src/features/animals/AnimalForm.tsx`
  funciona em modo criar E editar (rota `/animais/:id/editar`). Campos controlados.
  Persiste genealogia em `animal_relation` e foto em `file_asset`.
  - Correção importante já aplicada: o form ANTES inseria colunas inexistentes
    (`pedigree_pai/mae/avo_mat`) na tabela `animal`; agora grava em `animal_relation`.
- **Ficha do animal:** `src/features/animals/AnimalDetails.tsx` — genealogia visual,
  abas por programa, comparativo de DEPs normalizado via `trait_dictionary`, botões
  Editar/Excluir animal e editar/excluir por avaliação.
- **Avaliações dinâmicas:** `src/features/evaluations/EvaluationForm.tsx` — criar/editar
  (rotas `/animais/:id/avaliacao/nova` e `.../:evalId/editar`). Renderiza só as
  características mapeadas para o programa escolhido.
- **Upload de fotos:** `src/components/common/ImageUpload.tsx` (drag-and-drop → bucket
  `animal-photos`).
- **Simulador de cruzamento:** `src/features/simulator/Simulator.tsx` + `src/lib/scoring.ts`.
  Wizard 4-passos (perfil → programa/política → touro+fêmea → resultados com score composto,
  confiança, cobertura, alertas e tabela de traços). Motor puro e testável.
- **Dashboard:** `src/pages/Dashboard.tsx` — métricas reais (touros, fêmeas, avaliações) via Supabase count.
- **Relatórios:** `src/pages/Reports.tsx` — lista de cruzamentos salvos + geração de PDF via `pdfmake`.
- **Configurações:** `src/pages/Config.tsx` — nome da fazenda (tabela `farm`), toggle dark/light persistido no localStorage.
- **Assistente de IA:** `src/services/ollamaClient.ts` (fetch streaming, SEM SDK, SEM chave),
  `src/hooks/useChat.ts` (system prompt de pecuária), `src/features/assistant/Assistant.tsx`.
  Rota `/assistente`, link na sidebar.
- **Layout responsivo (mobile):** `src/components/layout/MainLayout.tsx` + `Sidebar.tsx`
  — sidebar off-canvas com menu hambúrguer em telas pequenas.
- **Desktop build (Electron):** `electron/main.cjs` + `electron/preload.cjs` + `package.json` (electron-builder config).
  Gera installer NSIS (com uninstaller) e portable .exe. `vite.config.ts` usa `base: './'` para compatibilidade.
- **AGENTS.md:** Guidelines do repositório escritas e commitadas.

## 4. PENDÊNCIAS (o que falta)

### 4a. Bucket de Storage do Supabase — BLOQUEIO para upload de fotos

O bucket **`animal-photos` NÃO existe** ainda. Sem ele, o upload falha (resto do app funciona).
- Criar no painel Supabase: Storage → New Bucket → nome `animal-photos` → **Public**.
- Precisa de policy de INSERT em `storage.objects` para a chave anônima
  (`bucket_id = 'animal-photos'`), pois o app usa o anon key direto do front.
- NOTA: tentativa anterior de criar policies permissivas via MCP/SQL foi **bloqueada pelo
  classificador de segurança** (afrouxar infra compartilhada). Deixe o USUÁRIO criar pelo
  painel, ou peça confirmação explícita antes de aplicar policy permissiva.

### 4b. Deploy no Vercel — BLOQUEIO no login do usuário

Objetivo: publicar para o usuário ver no celular. Código já está no GitHub.
- Vercel CLI instalado globalmente (v54.10.3) mas **SEM login**. O login usa device-flow
  (abre URL no navegador, usuário aprova). O usuário não conseguiu aprovar a tempo
  ("máximo de tentativas"); processos de login foram encerrados. NÃO fique reabrindo
  login em loop.
- Conta Vercel do usuário existe: team `team_khywGuCaWt5Gb30GdcPErRPf` ("avila2026's projects").
  O projeto `app-cruzamento-bovinos` ainda NÃO foi criado lá.
- **Caminho recomendado (painel, sem CLI):** usuário em https://vercel.com/new → login GitHub
  → se o repo não listar, "Configure GitHub App" e dar acesso ao repo → Import → setar
  env vars `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` → Deploy → Production Branch = `main-`.
- **Caminho CLI (precisa o usuário aprovar login 1x):** `vercel login` (device flow),
  depois `vercel link` + `vercel deploy --prod`. Há MCP tools do Vercel disponíveis
  (`deploy_to_vercel`, `list_projects`, `get_deployment`) — mas `deploy_to_vercel` só
  instrui a usar o CLI.

### 4c. Assistente de IA não funciona no app publicado

O assistente chama o Ollama em `localhost:11434` via proxy de DEV do Vite. No Vercel/celular
não existe esse daemon → dará erro de conexão. Funciona só no PC com `npm run dev`.
Para funcionar remoto seria preciso um backend/proxy (fora do escopo atual).
- Ollama do usuário: instalado, daemon ativo, modelo `gpt-oss:120b-cloud` (Ollama Cloud)
  disponível. Var `VITE_OLLAMA_MODEL=gpt-oss:120b-cloud`.

### 4d. Teste completo do simulador — precisa de fêmea cadastrada

O simulador funciona visualmente, mas **não há fêmeas no banco de dados**.
Para testar o cálculo de ponta a ponta: cadastrar uma fêmea (`/animais/novo`, sexo F),
depois lançar uma avaliação (`/animais/:id/avaliacao/nova`) no mesmo programa do touro
(ex: GENEPLUS). Então ir em `/simulador` e selecionar touro + fêmea.

## 5. Pegadinhas / convenções

- Branch é `main-` (com traço). Use exatamente isso em push/deploy.
- Commits são feitos direto na `main-` (convenção do repo). Co-author das mensagens:
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- Lints de acessibilidade (labels/title em inputs/selects) são PRÉ-EXISTENTES e não quebram
  o build (`tsc -b` passa). Não gaste tempo com eles a menos que peçam.
- `.env.local` é gitignored — segredos não vão ao GitHub; por isso env vars têm de ser
  configuradas no painel do Vercel.
- Path aliases (`@/`) **não existem**. Use caminhos relativos (`../../lib/supabase`).
- Nunca use `any` ou `ReturnType<typeof fn>`. Exporte interfaces nomeadas.

## 6. Próximo passo sugerido

1. **Cadastrar uma fêmea + avaliação** para testar o simulador de ponta a ponta.
2. **Criar o bucket `animal-photos`** no painel do Supabase.
3. **Deploy no Vercel** via painel web (caminho mais fácil que CLI).
4. Ou: instalar o app desktop local via `release/CattleGen Setup 1.0.0.exe`.
