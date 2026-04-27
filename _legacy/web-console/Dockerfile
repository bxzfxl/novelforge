# ── base 层：启用 corepack + pnpm ──────────────────────────────────────────────
FROM node:22-alpine AS base
# better-sqlite3 需要原生编译工具
RUN apk add --no-cache python3 make g++
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# ── deps 层：安装依赖 ──────────────────────────────────────────────────────────
FROM base AS deps
# 从 monorepo 根目录拷贝 workspace 配置和 lockfile
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY web-console/package.json ./web-console/
COPY remote-agent/package.json ./remote-agent/
# 安装全部依赖（包括 better-sqlite3 原生编译）
RUN pnpm install --frozen-lockfile || pnpm install

# ── builder 层：构建 Next.js ───────────────────────────────────────────────────
FROM base AS builder
ENV NEXT_TELEMETRY_DISABLED=1
# 拷贝 monorepo 根级 node_modules（next 等包安装在此处）
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/web-console/node_modules ./web-console/node_modules
# 拷贝 monorepo 根级 package.json（Turbopack 需要识别 workspace root）
COPY package.json pnpm-workspace.yaml ./
COPY web-console ./web-console
WORKDIR /app/web-console
RUN pnpm build

# ── runner 层：standalone 模式运行 ────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# 创建非 root 用户
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

# 拷贝 standalone 产物
COPY --from=builder /app/web-console/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/web-console/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/web-console/.next/static ./web-console/.next/static

# 创建数据目录并授权
RUN mkdir -p /app/data && chown nextjs:nodejs /app/data

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "web-console/server.js"]
