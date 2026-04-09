# ── base 层：启用 corepack + pnpm ──────────────────────────────────────────────
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# ── deps 层：仅安装生产依赖 ────────────────────────────────────────────────────
FROM base AS deps
COPY package.json pnpm-lock.yaml* ./
# remote-agent 位于 monorepo 子包，单独安装时无 workspace 约束
RUN pnpm install --frozen-lockfile --prod || pnpm install --prod

# ── builder 层：编译 TypeScript ────────────────────────────────────────────────
FROM base AS builder
COPY package.json pnpm-lock.yaml* tsconfig.json ./
RUN pnpm install --frozen-lockfile || pnpm install
COPY src ./src
RUN pnpm build

# ── runner 层：最小化运行镜像 ──────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# 创建非 root 用户
RUN addgroup --system --gid 1001 agent \
    && adduser --system --uid 1001 agent

# 拷贝编译产物和生产依赖
COPY --from=builder --chown=agent:agent /app/dist ./dist
COPY --from=deps --chown=agent:agent /app/node_modules ./node_modules
COPY --chown=agent:agent package.json ./

USER agent

EXPOSE 9100
ENV AGENT_PORT=9100

CMD ["node", "dist/index.js"]
