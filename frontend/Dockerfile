# ════════════════════════════════════════════════════════
# Stage 1 — Node builder
# ════════════════════════════════════════════════════════
FROM node:20-alpine AS builder

WORKDIR /app

# Cache dependency install layer separately
COPY package.json package-lock.json* ./
RUN npm ci --silent

# Copy source and build
COPY . .
RUN npm run build


# ════════════════════════════════════════════════════════
# Stage 2 — Nginx runtime
# ════════════════════════════════════════════════════════
FROM nginx:1.25-alpine AS runtime

LABEL description="Anemia AI Tracker — React frontend"

# Copy CRA production build
COPY --from=builder /app/build /usr/share/nginx/html

# Nginx config — SPA routing (all paths → index.html)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD wget -qO- http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]