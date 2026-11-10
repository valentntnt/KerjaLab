# syntax=docker/dockerfile:1

# ---------- Stage 1: builder ----------
# Memasang dependency produksi. Isi stage ini (cache npm, tool build) TIDAK ikut ke image akhir.
FROM node:22.14.0-alpine3.21 AS builder
WORKDIR /app
# Salin file dependency lebih dulu -> layer "npm ci" ter-cache selama package*.json tidak berubah
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
# Baru salin source code (sering berubah)
COPY src ./src

# ---------- Stage 2: runtime ----------
FROM node:22.14.0-alpine3.21 AS runtime
ENV NODE_ENV=production \
    PORT=4000
WORKDIR /app
# Hanya mengambil hasil dari builder (node_modules + src), dengan pemilik user non-root
COPY --from=builder --chown=node:node /app ./
USER node
EXPOSE 4000
# exec form: node menjadi PID 1 dan menerima SIGTERM langsung dari Docker
CMD ["node", "src/index.js"]
