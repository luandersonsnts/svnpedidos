FROM node:20-bookworm-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

ENV PYTHON=/usr/bin/python3

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV APP_RUNTIME_MODE=server
ENV PORT=3001

EXPOSE 3001

CMD ["node", "server/index.js"]
