# Deploy do CattleGen na Hostinger (hPanel + Git)

O app é um SPA React + Vite: após o build vira arquivos estáticos em `dist/`, servidos por qualquer hospedagem web da Hostinger (não precisa de Node em produção). O fluxo é:

```
push na branch main-  →  GitHub Actions builda  →  branch hostinger-deploy  →  webhook  →  hPanel publica em public_html
```

## 1. Configurar secrets no GitHub (uma vez)

Em **GitHub → repositório → Settings → Secrets and variables → Actions → New repository secret**, cadastre:

| Secret | Valor |
|---|---|
| `VITE_SUPABASE_URL` | `https://pmxdmuquerfttwyinwis.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | A chave **anon/public** do projeto (Supabase → Settings → API) |

> As variáveis `VITE_*` são embutidas no JavaScript **no momento do build** — por isso ficam no GitHub Actions, não no painel da Hostinger. A anon key é pública por design; a segurança real vem das políticas RLS do Supabase.

Depois, rode o workflow **Deploy Hostinger** (aba Actions → Run workflow, ou faça um push na `main-`). Ao terminar, a branch `hostinger-deploy` conterá `index.html`, `assets/` e `.htaccess`.

## 2. Conectar o repositório no hPanel (uma vez)

1. hPanel → **Sites → (seu domínio) → Avançado → GIT**.
2. Criar repositório:
   - **Repositório:** `https://github.com/avila2026/app-cruzamento-bovinos.git` (se o repo for privado, use a URL SSH e cadastre a deploy key que o hPanel gera em GitHub → Settings → Deploy keys)
   - **Branch:** `hostinger-deploy`
   - **Diretório:** vazio (= `public_html`). Se já houver site no domínio, esvazie o `public_html` antes.
3. Clique em **Implantar (Deploy)** para a primeira publicação.

## 3. Deploy automático via webhook (uma vez)

1. No mesmo painel GIT do hPanel, copie a **URL de webhook**.
2. GitHub → repositório → **Settings → Webhooks → Add webhook**: cole a URL, content type `application/json`, evento "Just the push event".

A partir daí, todo push na `main-` builda e publica sozinho.

## 4. SSL

hPanel → **Segurança → SSL**: instale o certificado (Let's Encrypt, grátis) e ative **Forçar HTTPS**.

## 5. Pré-requisitos no Supabase (produção)

1. **Storage:** criar o bucket `animal-photos` (sem ele o upload de fotos de animais falha).
2. **Edge Function `ai-assistant`:** implantar (`supabase functions deploy ai-assistant`) e configurar os secrets da função (chave do provedor de IA). O assistente em produção usa exclusivamente essa função — o provedor Ollama só aparece em desenvolvimento.
3. **Auth → URL Configuration:** adicionar o domínio Hostinger (ex.: `https://seudominio.com.br`) em *Site URL* e *Redirect URLs*.
4. **RLS:** as tabelas estão sem Row Level Security. Antes de uso multiusuário real, habilitar RLS com políticas por `farm`/usuário — pendência de segurança conhecida.

## Verificando o deploy

- Abrir o domínio: o app carrega e o login Supabase funciona.
- Acessar uma rota interna direto (ex.: `https://seudominio.com.br/reports`) e dar F5 — deve carregar o app, não erro 404 (valida o `.htaccess`).
- Cadastrar um animal com foto (valida o bucket) e fazer uma pergunta ao Assistente (valida a Edge Function).

## Solução de problemas

| Sintoma | Causa provável |
|---|---|
| 404 ao recarregar rotas internas | `.htaccess` ausente em `public_html` — confira se a branch `hostinger-deploy` o contém (arquivos ocultos!) |
| Tela branca / erro de conexão Supabase | Secrets `VITE_*` ausentes/errados no GitHub no momento do build |
| "Assistente indisponível" | Edge Function `ai-assistant` não implantada ou sem secrets |
| Upload de foto falha | Bucket `animal-photos` não criado no Storage |
| Login redireciona errado | Domínio fora das Redirect URLs no Supabase Auth |
