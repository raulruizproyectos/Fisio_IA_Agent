FROM node:20-alpine AS build
WORKDIR /app
# Copy package manifest(s) without requiring a lockfile to exist.
COPY package*.json ./
RUN npm install --no-audit --no-fund
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost/health || exit 1
CMD ["nginx", "-g", "daemon off;"]
