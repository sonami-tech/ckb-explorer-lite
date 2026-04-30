FROM oven/bun:1-alpine AS builder
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build

FROM nginx:alpine
RUN apk add --no-cache nodejs npm jq \
    && npm install -g json5 \
    && npm cache clean --force \
    && apk del npm
COPY --from=builder /app/dist /usr/share/nginx/html
COPY docker/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY docker/10-config-from-json5.sh /docker-entrypoint.d/10-config-from-json5.sh
RUN chmod +x /docker-entrypoint.d/10-config-from-json5.sh
EXPOSE 80
