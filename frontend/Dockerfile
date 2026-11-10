# syntax=docker/dockerfile:1

# ---------- Stage 1: deps ----------
FROM node:22.14.0-alpine3.21 AS deps
WORKDIR /app
# Dependency dulu (jarang berubah) -> layer cache terpakai ketika hanya source yang berubah
COPY package.json package-lock.json ./
RUN npm ci

# ---------- Stage 2: builder ----------
FROM node:22.14.0-alpine3.21 AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# Alamat backend untuk rewrite /api/* (nama SERVICE di network compose, bukan IP/localhost)
ARG BACKEND_URL=http://backend:4000
ENV BACKEND_URL=${BACKEND_URL}
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---------- Stage 3: runtime ----------
FROM node:22.14.0-alpine3.21 AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
# Hanya server standalone + aset statis; tanpa node_modules penuh, tanpa source, tanpa devDependencies
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public
USER node
EXPOSE 3000
CMD ["node", "server.js"]
