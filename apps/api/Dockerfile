# Production image of the API. Built from the repository root (Dokploy: build path "/",
# Dockerfile "apps/api/Dockerfile"): the API needs the workspace packages next to it.
FROM node:22-slim
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable
WORKDIR /repo

COPY . .
# Only the API and the packages it depends on.
RUN pnpm install --frozen-lockfile --filter "@7trip/api..." \
 && pnpm --filter "@7trip/api..." run build

ENV NODE_ENV=production
WORKDIR /repo/apps/api
EXPOSE 3100
# Migrations run before each start: a new version never runs against an older schema.
CMD ["sh", "-c", "pnpm exec prisma migrate deploy && node dist/main.js"]
