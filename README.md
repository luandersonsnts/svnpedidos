# svnpedidos

Plataforma de cardápio digital multi-tenant com front-end em React/Vite e API em Express.

## Arquitetura

- `src/`: aplicação React/Vite.
- `server/app.js`: cria o Express app com rotas, regras e observabilidade.
- `server/db/`: camada de banco desacoplada da aplicação, com providers `libsql`, `sqlite` e `postgres`.
- `server/index.js`: launcher fino para processo Node comum.
- `api/[...path].js`: adapter fino da Vercel para encaminhar `/api/*` para um upstream configurado por ambiente.

## Como roda hoje

- Front-end: Vercel Hobby.
- API: processo Node comum, podendo rodar em Koyeb, Render, Railway, VPS ou localmente.
- Banco atual recomendado: Turso/libSQL.
- Fallback local: SQLite apenas para desenvolvimento ou self-host fora de runtime efêmero.

## Variáveis de ambiente

Copie `.env.example` para `.env` e preencha o que fizer sentido para o seu ambiente.

### Runtime e servidor

- `NODE_ENV`: `development` ou `production`.
- `APP_RUNTIME_MODE`: `server` ou `serverless`.
- `SERVER_HOST`: host do Express.
- `SERVER_PORT`: porta da API Node.
- `FRONTEND_DIST_DIR`: diretório do build do front.
- `REQUEST_BODY_LIMIT`: limite do body parser.
- `USAGE_STATS_TOKEN`: token opcional para proteger `/admin/usage-stats`.

### Banco de dados

- `DB_PROVIDER`: `auto`, `libsql`, `sqlite` ou `postgres`.
- `LIBSQL_DB_URL`: URL do Turso/libSQL.
- `LIBSQL_DB_TOKEN`: token do Turso/libSQL.
- `SQLITE_DB_FILE`: caminho do arquivo SQLite local.
- `DATABASE_URL`: string de conexão do Postgres.
- `DB_RETRY_ATTEMPTS`: número de tentativas de retry.
- `DB_RETRY_BASE_DELAY_MS`: backoff inicial.
- `DB_RETRY_MAX_DELAY_MS`: backoff máximo.
- `DB_POOL_MAX`: tamanho máximo de pool para Postgres.
- `DB_POOL_IDLE_TIMEOUT_MS`: timeout ocioso do pool Postgres.
- `DB_POOL_CONNECTION_TIMEOUT_MS`: timeout de conexão do pool Postgres.
- `ALLOW_SQLITE_IN_SERVERLESS`: permite SQLite em runtime serverless apenas se você souber exatamente o que está fazendo.

### Admin e integrações

- `ADMIN_PASSWORD_HASH`: reservado para autenticação admin segura no back-end.
- `API_UPSTREAM_URL`: upstream usado pelo adapter `/api/*` da Vercel.

### Front-end

- `VITE_PORT`: porta do Vite em dev.
- `VITE_API_URL`: base absoluta opcional da API para builds específicos.
- `VITE_LOCAL_API_TARGET`: alvo do proxy local do Vite.
- `VITE_DEFAULT_ADMIN_PASSWORD`: fallback opcional de compatibilidade para setups antigos.
- `VITE_DEFAULT_WHATSAPP_NUMBER`: fallback opcional de compatibilidade.

## Desenvolvimento local

1. Instale dependências: `npm install`.
2. Copie `.env.example` para `.env`.
3. Rode tudo junto com `npm run dev:all`.
4. O front sobe em `5173` e o Vite faz proxy de `/api` para `VITE_LOCAL_API_TARGET`.

## Deploy na Vercel

### Front-end

1. Conecte o repositório na Vercel.
2. Configure `API_UPSTREAM_URL` para a URL pública do seu back-end Node.
3. Configure `VITE_API_URL` apenas se quiser buildar o front apontando para uma URL absoluta; no fluxo padrão o front continua chamando `/api/*` e a Vercel encaminha pelo adapter fino em `api/[...path].js`.
4. Garanta que `Deployment Protection` esteja desativado para o ambiente de produção se o cardápio for público.

### Back-end

- O mesmo código da API roda com `node server/index.js`.
- Não há dependência de helpers específicos da Vercel na lógica de negócio.
- Se `DB_PROVIDER=auto`, a API escolhe `libsql`, depois `postgres`, depois `sqlite`.

## Docker e self-host

### Dockerfile

- `Dockerfile` gera o build do front e sobe a API Express servindo `dist/`.

### Docker Compose com SQLite

```bash
docker compose --profile sqlite up --build
```

- Use `DB_PROVIDER=sqlite`.
- O arquivo SQLite fica persistido no volume `sqlite_data`.

### Docker Compose com Postgres

```bash
DB_PROVIDER=postgres docker compose --profile postgres up --build
```

- O serviço `postgres` sobe junto.
- A aplicação passa a usar `DATABASE_URL`.
- Nenhuma rota muda; só muda o provider na camada `server/db/`.

## Observabilidade básica

- `GET /health` e `GET /api/health`: validam a conexão real com o banco.
- `GET /admin/usage-stats`: mostra contagem diária em memória de requisições e escritas no banco.
- Se `USAGE_STATS_TOKEN` estiver configurado, envie `x-usage-stats-token` no request.

## Escalando o projeto

### Limites atuais

- Vercel Hobby: uso pessoal e não comercial, até 1.000.000 invocações, 100 GB de fast data transfer, 4 CPU-horas ativas por mês e limite de rotas/builds próprios do plano.
- Turso Free: 100 databases, 5 GB de storage total, 500 milhões de rows read por mês e 10 milhões de rows written por mês.

### Sinais de que está na hora de migrar

- O `/admin/usage-stats` começa a mostrar crescimento contínuo de tráfego e escritas perto da capacidade mensal planejada.
- Você passa a operar comercialmente e deixa de se enquadrar no Hobby da Vercel.
- O número de empresas ativas cresce a ponto de exigir mais isolamento operacional, mais observabilidade ou mais throughput de escrita.
- O banco começa a apresentar custo de row scan alto por falta de índices ou crescimento do catálogo.
- O time precisa de ambiente com mais previsibilidade de custo, logs mais longos ou deploy sem restrições de plataforma.

### Opções de destino

- Vercel Pro: mantém a mesma experiência de deploy do front, com mais recursos e suporte a uso comercial.
- Self-host com Docker: usa `Dockerfile` e `docker-compose.yml` deste repositório para rodar em VPS própria.
- Railway ou Render: executam o mesmo `node server/index.js` sem alteração na lógica.
- Postgres gerenciado ou em container: basta mudar `DB_PROVIDER=postgres` e apontar `DATABASE_URL`, mantendo a aplicação usando a mesma interface `server/db/`.

### Estratégia recomendada de migração

1. Monitorar `/admin/usage-stats` e métricas do painel da Vercel/Turso.
2. Migrar primeiro a hospedagem da API se o gargalo for função/plano.
3. Migrar o banco depois, se libSQL/Turso deixar de atender throughput, custo ou modelo operacional.
4. Manter a Vercel apenas para o front se isso continuar econômico.

## Observações

- SQLite local não é seguro para produção em runtime efêmero.
- Em Vercel, use Turso/libSQL ou um banco remoto.
- O adapter da Vercel foi mantido fino de propósito; regras de negócio e acesso a dados ficam fora dele.
