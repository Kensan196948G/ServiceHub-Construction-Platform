# ServiceHub Construction Platform - Frontend Dockerfile (multi-stage)
# syntax=docker/dockerfile:1.6

# =========================================================================
# Stage 1: deps — install node_modules (cache-friendly layer)
# =========================================================================
FROM node:20-alpine AS deps

WORKDIR /app

COPY package*.json ./
RUN npm ci --legacy-peer-deps

# =========================================================================
# Stage 2: builder — typecheck + vite build → /app/dist
# =========================================================================
FROM node:20-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

# =========================================================================
# Stage 3: development — Vite dev server with HMR
# =========================================================================
FROM node:20-alpine AS development

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN addgroup -S appgroup \
    && adduser -S appuser -G appgroup \
    && chown -R appuser:appgroup /app
USER appuser

EXPOSE 3000
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "3000"]

# =========================================================================
# Stage 4: production — nginx:alpine serving static SPA assets on :3000
# (port 3000 keeps outer reverse-proxy upstream `frontend:3000` untouched)
# =========================================================================
FROM nginx:1.27-alpine AS production

# Upgrade all OS packages to pick up security patches (CVE mitigation)
RUN apk upgrade --no-cache

# Remove default server block; ship our own SPA-aware config
RUN rm -f /etc/nginx/conf.d/default.conf

COPY --from=builder /app/dist /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# nginx:alpine already has a curl-less HEALTHCHECK-compatible wget
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:3000/ >/dev/null || exit 1

EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]
