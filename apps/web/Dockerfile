# Production image of the guest web. Built from the repository root (Dokploy: build path "/",
# Dockerfile "apps/web/Dockerfile").
FROM node:22-slim AS build
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile --filter "@7trip/web..." \
 && pnpm --filter "@7trip/web..." run build

# Nitro's output is self-contained: no node_modules needed at run time.
FROM node:22-slim
WORKDIR /app
COPY --from=build /repo/apps/web/.output ./.output
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
