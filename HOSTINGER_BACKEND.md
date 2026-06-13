# Camada de API PHP na Hostinger (MySQL)

Esta é uma camada **aditiva**: o Supabase continua responsável por tudo que o app
já faz hoje (auth, animais, avaliações, simulador, fotos, assistente de IA com
RAG). A API PHP existe para **funcionalidades novas** que você queira apoiar no
MySQL da Hostinger, aproveitando os recursos que já vêm com a hospedagem.

## Por que PHP?

O navegador não fala direto com MySQL (não é uma API web, é uma conexão TCP que
na Hostinger compartilhada só aceita `localhost`). É preciso uma camada de
servidor no meio. A hospedagem compartilhada da Hostinger roda **PHP + MySQL**
nativamente, sem configuração extra — então a API PHP roda no mesmo servidor que
o banco e é publicada junto com o app.

## Como é publicada

Os arquivos ficam em `public/api/`. O build do Vite copia `public/` inteiro para
`dist/`, então após o deploy eles ficam em `https://SEU-DOMINIO/api/*.php`,
**na mesma origem** do app (sem CORS em produção). A regra de SPA do `.htaccess`
não interfere porque ela só reescreve o que **não** é arquivo real.

> Em hosts sem PHP (ex.: Vercel) esses arquivos ficam inertes — a API PHP é um
> recurso específico da Hostinger.

## Configuração (uma vez)

1. No hPanel → **Bancos de dados → phpMyAdmin**, confirme o banco
   `u786088869_Genetica` e crie as tabelas das suas funcionalidades.
2. Crie o arquivo de credenciais a partir do modelo. Via **Gerenciador de
   Arquivos** do hPanel, em `public_html/api/`, copie `db_config.example.php`
   para `db_config.php` e preencha:

   ```php
   return [
       'host'    => 'localhost',
       'name'    => 'u786088869_Genetica',
       'user'    => 'u786088869_Claude',
       'pass'    => 'a-senha-nova',   // troque a senha que vazou no print!
       'charset' => 'utf8mb4',
       'cors_origin' => '*',
   ];
   ```

   `db_config.php` é ignorado pelo Git — as credenciais nunca vão para o
   repositório. Como o deploy sobrescreve `public_html` a cada build, mantenha
   esse arquivo fora do fluxo de build (crie-o uma vez direto no servidor; se o
   deploy apagá-lo, recrie — ou defina as credenciais por variável de ambiente
   do PHP, se o seu plano permitir).

## Testando a integração

Abra no navegador: `https://SEU-DOMINIO/api/health.php`

Resposta esperada:
```json
{ "status": "ok", "db": "connected", "mysql_version": "...", "server_time": "..." }
```

No app, o cliente está em `src/services/hostingerApi.ts`:
```ts
import { checkApiHealth } from './services/hostingerApi';
const health = await checkApiHealth(); // { status: 'ok', db: 'connected', ... }
```

## Criando uma funcionalidade nova

1. **Tabela** (phpMyAdmin). Exemplo usado pelo endpoint-modelo:
   ```sql
   CREATE TABLE app_note (
     id         INT AUTO_INCREMENT PRIMARY KEY,
     content    TEXT NOT NULL,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );
   ```
2. **Endpoint**: copie `public/api/example_endpoint.php`, renomeie e adapte.
   Ele já traz o padrão: `cors()`, checagem de `Authorization`, leitura (GET) e
   escrita (POST) com prepared statements via `db()`.
3. **Frontend**: adicione uma função em `src/services/hostingerApi.ts` chamando
   o novo endpoint, e consuma a partir do componente.

## Segurança — leia antes de expor dados reais

- Os endpoints ficam **públicos na internet**. O `health.php` não retorna dados.
  O `example_endpoint.php` exige um header `Authorization: Bearer ...`, mas
  **ainda não valida o token** — é um stub.
- Antes de expor dados de verdade, implemente a validação. Como o app já tem uma
  sessão Supabase, o caminho recomendado é enviar o **JWT do Supabase** no header
  `Authorization` e validá-lo no PHP com o *JWT secret* do projeto (HS256). Esse
  segredo vai em `db_config.php`, nunca no código.
- Sempre use **prepared statements** (como nos modelos) — nunca concatene entrada
  do usuário em SQL.
- **Troque a senha do MySQL** que apareceu no print compartilhado.
