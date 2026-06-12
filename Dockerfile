FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:24-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
RUN addgroup -S nexora && adduser -S nexora -G nexora
COPY --from=build /app/package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/server ./server
COPY --from=build /app/dist ./dist
RUN mkdir -p /app/data && chown -R nexora:nexora /app
USER nexora
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD-SHELL wget -qO- "http://127.0.0.1:${PORT:-3000}/health/ready" || exit 1
CMD ["node", "server/index.js"]
