# syntax=docker/dockerfile:1
FROM node:22.23.1-bookworm-slim AS dependencies
WORKDIR /app
RUN npm install --global pnpm@12.8.1
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM dependencies AS build
COPY . .
RUN pnpm build

FROM dependencies AS production-dependencies
RUN pnpm prune --prod

FROM debian:bookworm-slim AS bark
ARG TARGETARCH
RUN test "$TARGETARCH" = amd64 || (echo "Bark 0.7.1 binary deployment requires linux/amd64" >&2; exit 1)
RUN apt-get update && apt-get install --yes --no-install-recommends ca-certificates curl \
    && rm -rf /var/lib/apt/lists/*
RUN curl --fail --location --retry 3 --proto '=https' --tlsv1.2 \
      https://gitlab.com/ark-bitcoin/bark/-/releases/bark-0.7.1/downloads/bark-0.7.1-linux-x86_64 \
      --output /usr/local/bin/bark \
    && curl --fail --location --retry 3 --proto '=https' --tlsv1.2 \
      https://gitlab.com/ark-bitcoin/bark/-/releases/bark-0.7.1/downloads/barkd-0.7.1-linux-x86_64 \
      --output /usr/local/bin/barkd \
    && echo 'ce12ba616bdd1a7f97ddcfeb070f44e79308842b529456e5b3947f1332fcdbaf  /usr/local/bin/bark' | sha256sum --check \
    && echo '8067b9aab31e250e5580620e3fd0be61f5b778860346d2433b11eae9992db85a  /usr/local/bin/barkd' | sha256sum --check \
    && chmod 755 /usr/local/bin/bark /usr/local/bin/barkd

FROM node:22.23.1-bookworm-slim AS runtime
RUN apt-get update && apt-get install --yes --no-install-recommends ca-certificates tini util-linux \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production \
    DATABASE_URL=file:/data/mainnet.db \
    BARK_RECEIVER_DATADIR=/data/receiver \
    PAYMENTS_LOG_DIR=/data/logs \
    BARK_BIN=/usr/local/bin/bark \
    BARKD_BIN=/usr/local/bin/barkd \
    PORT=3100 \
    HOST=0.0.0.0
COPY --from=bark /usr/local/bin/bark /usr/local/bin/barkd /usr/local/bin/
COPY --from=production-dependencies /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/drizzle ./drizzle
COPY package.json tsconfig.json ./
COPY scripts/production.ts scripts/production-healthcheck.ts ./scripts/
COPY src/db/database.ts ./src/db/
COPY src/server/env.ts ./src/server/
COPY src/server/deployment ./src/server/deployment/
RUN mkdir -p /data && chown node:node /data && chmod 700 /data \
    && bark --version && barkd --version
USER node
VOLUME ["/data"]
EXPOSE 3100
HEALTHCHECK --interval=30s --timeout=10s --start-period=120s --retries=3 \
    CMD ["node", "--import", "tsx", "scripts/production-healthcheck.ts"]
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["flock", "--nonblock", "--no-fork", "/data/deployment.lock", "node", "--import", "tsx", "scripts/production.ts"]
