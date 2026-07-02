FROM node:20-bookworm-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV APP_RUNTIME_MODE=server
ENV PORT=3001

EXPOSE 3001

CMD ["node", "server/index.js"]
