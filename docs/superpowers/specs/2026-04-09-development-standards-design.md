# NovelForge 开发规范

> 标准工程型开发规范，约束 UI 设计系统、前端代码组织、后端分层架构与工程质量。

---

## 一、UI 设计系统

### 1.1 设计风格

明亮清爽风，暖橙主色调。"创意与灵感"的产品隐喻。

### 1.2 配色体系

**主色**

| Token | 值 | 用途 |
|-------|----|------|
| `--color-primary` | `#EA580C` | 主操作、导航高亮、进度条 |
| `--color-primary-hover` | `#C2410C` | 主色悬停态 |
| `--color-primary-light` | `#FFF7ED` | 主色背景（选中行、高亮区） |
| `--color-primary-border` | `#FED7AA` | 主色边框（强调分隔线） |
| `--color-primary-gradient` | `#EA580C → #F97316` | 进度条渐变、品牌色渐变 |

**语义色**

| Token | 色值 | 背景色 | 用途 |
|-------|------|--------|------|
| `--color-success` | `#16A34A` | `#F0FDF4` | 完成、通过、正常运行 |
| `--color-warning` | `#D97706` | `#FFFBEB` | 告警、待审阅、接近上限 |
| `--color-danger` | `#DC2626` | `#FEF2F2` | 错误、失败、终止 |
| `--color-info` | `#2563EB` | `#EFF6FF` | 提示、链接、信息态 |

**中性色阶（Slate）**

| Token | 值 | 用途 |
|-------|----|------|
| `--color-bg` | `#FFFBF5` | 页面背景（暖白） |
| `--color-bg-card` | `#FFFFFF` | 卡片/面板背景 |
| `--color-border` | `#F1F5F9` | 轻边框 |
| `--color-border-strong` | `#E2E8F0` | 强边框 |
| `--color-text-primary` | `#1E293B` | 标题文字 |
| `--color-text-body` | `#475569` | 正文文字 |
| `--color-text-muted` | `#94A3B8` | 辅助/占位文字 |
| `--color-text-disabled` | `#CBD5E1` | 禁用态文字 |

### 1.3 排版系统

| Token | 值 | 用途 |
|-------|----|------|
| `--font-sans` | Geist Sans | 界面文字 |
| `--font-mono` | Geist Mono | 代码、终端 |
| `--text-xs` | 12px / 1.5 | 辅助说明、标签 |
| `--text-sm` | 13px / 1.5 | 正文 |
| `--text-base` | 14px / 1.5 | 小标题 |
| `--text-lg` | 16px / 1.3 | 页标题 |
| `--text-xl` | 20px / 1.3 | 大标题 |
| `--font-weight-normal` | 400 | 正文 |
| `--font-weight-medium` | 500 | 强调 |
| `--font-weight-semibold` | 600 | 标题 |
| `--font-weight-bold` | 700 | 数字/关键指标 |

### 1.4 间距系统

基于 4px 栅格：

| Token | 值 | 用途 |
|-------|----|------|
| `--space-1` | 4px | 图标与文字间距 |
| `--space-2` | 8px | 紧凑元素间距 |
| `--space-3` | 12px | 卡片间距、列表项间距 |
| `--space-4` | 16px | 卡片内边距 |
| `--space-6` | 24px | 页面边距、区块间距 |
| `--space-8` | 32px | 大区块间距 |
| `--space-12` | 48px | 页面顶部/底部留白 |

### 1.5 圆角系统

| Token | 值 | 用途 |
|-------|----|------|
| `--radius-sm` | 4px | Badge、Tag |
| `--radius-md` | 6px | Button、Input |
| `--radius-lg` | 8px | Card、Dropdown |
| `--radius-xl` | 12px | Dialog、Sheet |

### 1.6 布局结构

经典侧边栏布局：

```
┌─────────────────────────────────────────────────┐
│ 顶部状态栏（Logo | 项目名 | 管线状态 | Token）   │
├──────────┬──────────────────────────────────────┤
│ 侧边导航 │                                      │
│          │          主内容区                      │
│ 主要     │                                      │
│ · 仪表盘 │                                      │
│ · 管线   │                                      │
│ · 编剧室 │                                      │
│          │                                      │
│ 内容     │                                      │
│ · 资料库 │                                      │
│ · 稿件   │                                      │
│ · 检查点 │                                      │
│          │                                      │
│ 系统     │                                      │
│ · 配置   │                                      │
│ · 终端   │                                      │
└──────────┴──────────────────────────────────────┘
```

- 侧边栏固定宽度 200px，可折叠至 48px（图标模式）
- 顶部状态栏高度 48px，固定置顶
- 内容区自适应，内边距 24px
- 侧边导航项分三组：主要、内容、系统

### 1.7 组件使用规范

- 所有基础组件使用 shadcn/ui，不自造轮子
- 业务组件基于 shadcn/ui 组合封装，放在 `features/{domain}/components/`
- 状态徽章统一用 Badge 组件 + 语义色映射：
  - `running` → primary（橙）
  - `completed` → success（绿）
  - `failed` → danger（红）
  - `pending` → muted（灰）
- 表单控件统一用 shadcn 的 Input/Select/Switch/Textarea
- Toast 通知统一用 Sonner，位置 bottom-right
- Tooltip 需要 TooltipProvider 包裹根布局

---

## 二、前端代码规范

### 2.1 目录结构

```
web-console/src/
├── app/                          # Next.js App Router 路由
│   ├── layout.tsx                # 根布局（侧边栏 + 顶栏）
│   ├── page.tsx                  # 仪表盘
│   ├── pipeline/page.tsx
│   ├── writers-room/page.tsx
│   ├── lore/
│   │   ├── page.tsx              # 资料库总览
│   │   ├── world/page.tsx
│   │   ├── characters/page.tsx
│   │   └── threads/page.tsx
│   ├── manuscript/page.tsx
│   ├── checkpoints/page.tsx
│   ├── settings/page.tsx
│   ├── terminal/page.tsx
│   └── api/                      # Route Handlers
│       ├── pipeline/route.ts
│       ├── writers-room/route.ts
│       ├── lore/[type]/[id]/route.ts
│       ├── manuscript/route.ts
│       ├── checkpoints/[id]/route.ts
│       ├── config/route.ts
│       └── tokens/route.ts
├── components/
│   ├── ui/                       # shadcn/ui 基础组件（不手动修改）
│   ├── shared/                   # 跨域共享业务组件
│   │   ├── app-sidebar.tsx       # 侧边栏导航
│   │   ├── top-bar.tsx           # 顶部状态栏
│   │   ├── status-badge.tsx      # 统一状态徽章
│   │   ├── loading-skeleton.tsx  # 统一骨架屏
│   │   └── error-fallback.tsx    # 统一错误回退
│   └── providers/                # Context Providers
│       ├── socket-provider.tsx
│       └── tooltip-provider.tsx
├── features/                     # 按功能域组织的业务模块
│   ├── dashboard/
│   │   ├── components/           # 域内专用组件
│   │   ├── hooks/                # 域内专用 hooks
│   │   └── types.ts              # 域内类型
│   ├── pipeline/
│   ├── writers-room/
│   ├── lore/
│   ├── manuscript/
│   ├── checkpoints/
│   ├── settings/
│   └── terminal/
├── hooks/                        # 全局共享 hooks
│   ├── use-fetch.ts              # 统一 API 请求（SWR 模式）
│   ├── use-socket.ts             # 统一 WebSocket 订阅
│   └── use-debounce.ts
├── lib/                          # 工具库与核心逻辑
│   ├── api-client.ts             # fetch 封装（拦截器、错误转换）
│   ├── errors.ts                 # AppError + Result<T>
│   ├── constants.ts              # 全局常量
│   ├── db/                       # SQLite 数据层
│   │   ├── schema.ts
│   │   ├── index.ts
│   │   └── queries.ts
│   └── utils.ts                  # shadcn cn() 工具
├── services/                     # Service 层
├── repositories/                 # Repository 层
└── types/                        # 全局类型定义
    ├── api.ts                    # API 请求/响应类型
    ├── models.ts                 # 数据模型类型
    └── socket-events.ts          # WebSocket 事件类型
```

### 2.2 命名约定

| 类型 | 规则 | 示例 |
|------|------|------|
| 文件/目录 | kebab-case | `pipeline-status.tsx` |
| React 组件 | PascalCase | `PipelineStatus` |
| hooks | camelCase, `use` 前缀 | `usePipelineStatus` |
| 类型/接口 | PascalCase | `PipelineConfig` |
| 常量 | UPPER_SNAKE_CASE | `MAX_CONCURRENT_PROCESSES` |
| CSS 变量 | kebab-case, `--` 前缀 | `--color-primary` |
| API 路由 | kebab-case | `/api/writers-room/current` |
| 事件处理 | `handle` 前缀 | `handleSubmit`、`handleClick` |

### 2.3 组件编写规范

- 一个文件一个组件，文件名与组件名对应
- Props 类型定义在组件文件顶部，命名为 `{ComponentName}Props`
- 优先用函数组件 + hooks，不用 class 组件
- 条件渲染：简单用 `&&`，复杂用 early return
- 列表渲染 key 使用业务 ID，禁止用数组 index
- 组件文件结构顺序：类型定义 → 组件函数 → 导出

### 2.4 状态管理分层

| 层级 | 工具 | 场景 |
|------|------|------|
| 服务端状态 | `useFetch`（SWR 模式） | API 数据获取与缓存 |
| 实时状态 | `useSocket` | WebSocket 推送数据 |
| 全局客户端状态 | Zustand store | 管线状态、用户配置 |
| 局部 UI 状态 | `useState` | 表单输入、折叠、开关 |
| URL 状态 | `useSearchParams` | 筛选条件、分页参数 |

**Zustand Store 规范：**

- 每个 store 一个文件，放 `features/{domain}/` 或 `hooks/` 下
- Store 命名 `use{Domain}Store`
- 只存真正需要跨组件共享的状态，局部状态用 `useState`

### 2.5 导入顺序

```typescript
// 1. Node 内置模块
import path from 'node:path';

// 2. 第三方库
import { NextRequest } from 'next/server';
import { useEffect } from 'react';

// 3. 内部别名 @/*
import { AppError } from '@/lib/errors';
import { Button } from '@/components/ui/button';

// 4. 相对路径（同模块内）
import { PipelineCard } from './pipeline-card';
```

各组之间空一行。

---

## 三、后端代码规范

### 3.1 分层架构

```
请求流向：HTTP Request → Route Handler → Service → Repository → SQLite
响应流向：SQLite → Repository → Service → Route Handler → HTTP Response
```

| 层 | 职责 | 禁止 |
|----|------|------|
| Route Handler | 参数校验、调用 Service、格式化 HTTP 响应 | 写业务逻辑、直接访问数据库 |
| Service | 业务逻辑、跨 Repository 编排、事务管理 | 访问 HTTP 对象、互相调用 |
| Repository | SQL 查询、数据映射 | 写业务判断、抛业务异常 |

### 3.2 目录结构

```
services/
├── pipeline.service.ts
├── writers-room.service.ts
├── lore.service.ts
├── manuscript.service.ts
├── checkpoint.service.ts
├── config.service.ts
└── token.service.ts

repositories/
├── process.repo.ts
├── chapter.repo.ts
├── checkpoint.repo.ts
├── config.repo.ts
├── event.repo.ts
└── token-usage.repo.ts
```

### 3.3 Route Handler 规范

```typescript
// app/api/pipeline/route.ts
import { NextRequest, NextResponse } from 'next/server';
import * as pipelineService from '@/services/pipeline.service';

// 标准格式：参数校验 → 调用 Service → 统一响应
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const status = searchParams.get('status');

  const result = pipelineService.getStatus(status);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error.message, code: result.error.code },
      { status: result.error.statusCode }
    );
  }
  return NextResponse.json({ data: result.data });
}
```

**规则：**

- 不写业务逻辑，只做"接参 → 调用 → 响应"
- 参数校验失败直接返回 400
- Service 返回 `Result<T>`，Route Handler 映射为 HTTP 状态码
- 成功响应统一 `{ data: T }`，错误响应统一 `{ error: string, code: string }`

### 3.4 Service 规范

```typescript
// services/pipeline.service.ts
import * as processRepo from '@/repositories/process.repo';
import { ok, err, type Result } from '@/lib/errors';
import { AppError } from '@/lib/errors';

export function startPipeline(config: PipelineStartInput): Result<PipelineStatus> {
  const running = processRepo.findByStatus('running');
  if (running.length >= MAX_CONCURRENT) {
    return err(new AppError('PIPELINE_BUSY', '已达最大并发数', 409));
  }
  // 业务逻辑...
  return ok(status);
}
```

**规则：**

- 所有函数返回 `Result<T>`，不用 try-catch 抛异常
- Service 之间不互相调用，避免循环依赖
- 跨表事务在 Service 层用 `getDb().transaction()` 包裹
- 复杂业务逻辑在函数顶部用 JSDoc 说明意图

### 3.5 Repository 规范

```typescript
// repositories/process.repo.ts
import { getDb } from '@/lib/db';
import type { ProcessRecord } from '@/types/models';

export function findById(id: string): ProcessRecord | undefined {
  return getDb()
    .prepare('SELECT * FROM processes WHERE id = ?')
    .get(id) as ProcessRecord | undefined;
}

export function findByStatus(status: string): ProcessRecord[] {
  return getDb()
    .prepare('SELECT * FROM processes WHERE status = ? ORDER BY started_at DESC')
    .all(status) as ProcessRecord[];
}

export function insert(record: Omit<ProcessRecord, 'created_at'>): void {
  getDb()
    .prepare('INSERT INTO processes (id, cli_type, role, chapter_number, status, started_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(record.id, record.cli_type, record.role, record.chapter_number, record.status, record.started_at);
}
```

**规则：**

- 纯数据访问，不含业务判断
- 所有 SQL 使用参数化查询，禁止字符串拼接
- 函数命名：`findById` / `findByStatus` / `insert` / `update` / `delete` / `list`
- 返回原始数据类型或 `undefined`，不包装 Result

### 3.6 统一错误体系

```typescript
// lib/errors.ts

export class AppError {
  constructor(
    public code: string,            // 机器可读错误码：PIPELINE_BUSY
    public message: string,         // 人类可读描述：已达最大并发数
    public statusCode: number = 500 // HTTP 状态码映射
  ) {}
}

export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: AppError };

export const ok = <T>(data: T): Result<T> => ({ ok: true, data });
export const err = (error: AppError): Result<never> => ({ ok: false, error });
```

**错误码命名规范：** `{DOMAIN}_{ACTION}` 格式，如 `PIPELINE_BUSY`、`CHAPTER_NOT_FOUND`、`CONFIG_INVALID`。

### 3.7 WebSocket 事件规范

**事件命名：** `{namespace}:{action}` 格式。

| 方向 | 事件名 | 说明 |
|------|--------|------|
| C→S | `subscribe:process` | 订阅进程输出 |
| C→S | `unsubscribe:process` | 取消订阅 |
| C→S | `terminal:input` | 终端输入 |
| C→S | `subscribe:pipeline` | 订阅管线状态 |
| S→C | `process:output` | CLI 实时输出流 |
| S→C | `process:status` | 进程状态变更 |
| S→C | `pipeline:status` | 管线状态更新 |
| S→C | `pipeline:decision` | 制片人决策 |
| S→C | `writers-room:update` | 角色状态更新 |
| S→C | `file:changed` | 文件变更通知 |
| S→C | `checkpoint:created` | 新检查点创建 |
| S→C | `alert` | 告警通知 |

所有事件类型在 `types/socket-events.ts` 统一定义，前后端共享。

---

## 四、工程质量规范

### 4.1 TypeScript 严格模式

- `strict: true` 全量开启
- 禁止 `any`，特殊情况用 `unknown` + 类型守卫
- 导出类型使用 `export type`
- 第三方库无类型定义时在 `types/vendor.d.ts` 补充声明

### 4.2 代码硬性约束

| 指标 | 上限 |
|------|------|
| 函数行数 | ≤ 50 行 |
| 文件行数 | ≤ 300 行 |
| 嵌套层级 | ≤ 3 层 |
| 函数参数 | ≤ 3 个（超出用 options 对象） |
| 组件 Props | ≤ 8 个（超出需拆分组件） |
| 圈复杂度 | ≤ 10 |
| 魔法数字 | 禁止（提取为命名常量） |

### 4.3 ESLint + Prettier

**Prettier 配置：**

- 单引号、无分号、2 空格缩进
- 尾逗号 `all`、打印宽度 100

**ESLint 关键规则：**

- 继承 `eslint-config-next` + `typescript-eslint/recommended`
- 禁止 `any`（`@typescript-eslint/no-explicit-any: error`）
- 禁止非空断言（`@typescript-eslint/no-non-null-assertion: error`）
- 强制 exhaustive switch（`@typescript-eslint/switch-exhaustiveness-check: error`）
- 导入排序（`import/order`）

### 4.4 Git 工作流

- 分支命名：`feat/<topic>`、`fix/<topic>`、`refactor/<topic>`
- Commit 格式：`<type>(scope): <中文摘要>`
  - `type`：`feat` / `fix` / `refactor` / `docs` / `test` / `chore`
  - `scope` 可选
  - 摘要使用中文、动词开头、≤ 50 字、不加句号
- 每个 Phase/Task 完成后提交，不堆积大 commit

### 4.5 测试分级

| 级别 | 覆盖对象 | 工具 | 触发条件 |
|------|---------|------|---------|
| L0 定向验证 | 局部修改、配置变更 | 手动 + curl | 所有改动 |
| L1 回归测试 | Service 层业务逻辑 | Vitest | 核心业务逻辑变更 |
| L2 集成测试 | API Route 端到端 | Vitest + supertest | 新增/修改 API |
| L3 UI 验证 | 页面渲染与交互 | Chrome 自动化 | 页面级变更 |

**强制测试场景：**

- Service 层核心逻辑必须有 L1 测试
- 新增 API 端点必须有 L2 冒烟测试
- 不强制 TDD，按"行为影响 × 共享范围 × 回归风险"判定级别

### 4.6 文档规范

- 代码注释使用简体中文，简洁清晰
- 函数级注释只在"逻辑不自明"时添加
- 复杂业务逻辑在函数顶部用 `/** */` 说明意图和边界条件
- API 端点在 Route Handler 文件顶部注释用途和参数
- 禁止无意义注释（如 `// 获取用户`、`// 返回结果`）
