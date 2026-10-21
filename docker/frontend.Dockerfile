# ==========================================
# Phase 1: Compile and Build React Assets
# ==========================================
FROM node:18-alpine as builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ==========================================
# Phase 2: Host Static Assets on Nginx
# ==========================================
FROM nginx:alpine as runner

COPY --from=builder /app/dist /usr/share/nginx/html
# Add custom nginx routing fallback configuration for single page application (SPA)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
