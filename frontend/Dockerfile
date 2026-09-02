FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY runtime-config.template.js /etc/fisio/runtime-config.template.js
COPY docker-entrypoint.d/40-fisio-runtime-config.sh /docker-entrypoint.d/40-fisio-runtime-config.sh
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
