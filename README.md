# svnpedidos

Projeto do site "SVN Pedidos" com front React/Vite e API Express.

## Deploy gratuito (front, back e banco)

Este projeto foi preparado para rodar gratuitamente com:
- Front-end: Vercel (Free)
- Back-end: Koyeb (Free) ou Deta Space (Free)
- Banco: Turso (libSQL, Free)

### 1) Banco Turso (libSQL)
1. Instale o CLI e faça login: `npm i -g @turso/cli` e `turso auth signup`.
2. Crie a base: `turso db create svnpedidos`.
3. Obtenha URL e token: `turso db tokens create svnpedidos`.
4. Configure no ambiente:
   - `LIBSQL_DB_URL=<url da base>`
   - `LIBSQL_DB_TOKEN=<token gerado>`
5. Ao iniciar a API, as tabelas são criadas automaticamente.

Localmente, se `LIBSQL_DB_URL` não estiver definido, a API usa `data.sqlite` com `better-sqlite3`.

### 2) Back-end (Express)
- O servidor detecta automaticamente Turso via variáveis de ambiente.
- Endpoints:
  - `GET /api/cardapio?establishment_id=...`
  - `GET /api/establishment/:id/status`
  - CRUD de categorias e produtos.

Deploy gratuito sugerido:
- Koyeb: crie um app apontando para este repositório, escolha Node 18+, configure `LIBSQL_DB_URL` e `LIBSQL_DB_TOKEN`. Porta: `3001`.
- Deta Space: importe o repo e configure as mesmas variáveis; comando de execução `node server/index.js`.

### 3) Front-end (Vercel)
1. Conecte o repo no Vercel.
2. Configure `VITE_API_URL` como a URL pública do seu back-end (ex.: `https://<seu-app>.koyeb.app`).
3. Faça o deploy. O front usa `VITE_API_URL` automaticamente; em dev local, cai para `http://localhost:3001`.

### 4) Desenvolvimento local
1. Instale dependências: `npm install`.
2. Rode tudo junto: `npm run dev:all` (front em `5173`, API em `3001`).
3. Opcional: crie `.env` a partir de `.env.example` para apontar Turso.

### 5) Observações
- Tiers gratuitos podem ter cold start e limites de conexões.
- Se usar SQLite local, o arquivo `data.sqlite` não é persistente em hosts serverless — use Turso em produção.
- CORS já está habilitado na API.