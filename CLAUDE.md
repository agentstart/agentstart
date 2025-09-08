# Agent-First Next.js Fullstack Template

## 核心理念

传统的 template 是给开发者使用，目的是复用 template 内置的功能节约开发时间，但这个 template 是给 agent 使用，更重要的是节约 token 使用，给 agent 一定的方向，提升 vibe coding 质量。

第一重要的是默认带有一个 fullstack project 需要的能力，db/auth/payment 等等，并且实现足够清晰、简洁。
另外一个很重要的是有清晰的结构与说明，让 agent 更容易去理解、使用已有的能力。

## 让 Agent 理解 Template 的关键措施

### **最关键的三件事**

1. **AGENTS.md** - 让 agent 5 秒内理解项目
2. **capabilities.ts** - 让 agent 知道能做什么
3. **约定大于配置** - 让 agent 不用思考就知道文件在哪

### **优先级措施**

#### 第一优先级：即时可查的文档

**AGENTS.md - 单一真相源**

- 位置固定：根目录，agent 第一个会查看
- 内容精简：不超过 500 行，避免 token 浪费
- 结构化：用 markdown 标题清晰分层

```markdown
# Quick Start (最重要！)

bun dev # 启动开发
bun db:push # 同步数据库
bun test # 运行测试

# Architecture Overview (一张图说清楚)

[简单的 ASCII 架构图]

# Common Tasks (直接给命令)

## Add new API endpoint

1. Create: packages/api/src/routers/[name].ts (使用 oRPC)
2. Export in: packages/api/src/router.ts
3. Use in frontend: 通过 oRPC client 调用

重要：
- 所有 API 都必须写在 @packages/api/src/routers，不要在 app/api 下创建 route.ts
- 前端调用 oRPC API 时，统一使用: import { orpc } from "@/lib/orpc"

## Frontend API 调用规范 (oRPC + TanStack Query)

### Query (数据查询)
```typescript
import { useQuery } from "@tanstack/react-query";
import { orpc } from "@/lib/orpc";

// 使用 oRPC 的 queryOptions
const { data, isLoading } = useQuery(
  orpc.dev.listUsers.queryOptions({
    input: { page: 1, limit: 10 },
    refetchInterval: 30000, // 自动刷新
    placeholderData: keepPreviousData, // 分页时保留旧数据
  })
);
```

### Mutation (数据变更) with 乐观更新
```typescript
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { orpc } from "@/lib/orpc";

const queryClient = useQueryClient();

const createUserMutation = useMutation(
  orpc.dev.createUser.mutationOptions({
    onMutate: async (newUser) => {
      // 1. 取消相关查询
      await queryClient.cancelQueries({ queryKey: listUsersQueryKey });
      
      // 2. 保存当前数据快照
      const previousUsers = queryClient.getQueryData(listUsersQueryKey);
      
      // 3. 乐观更新
      queryClient.setQueryData(listUsersQueryKey, (old) => ({
        ...old,
        users: [newUser, ...old.users],
      }));
      
      return { previousUsers };
    },
    onError: (err, newUser, context) => {
      // 出错时回滚
      queryClient.setQueryData(listUsersQueryKey, context?.previousUsers);
      toast.error(err.message);
    },
    onSuccess: () => {
      toast.success("Created successfully");
    },
    onSettled: () => {
      // 无论成功失败都重新获取数据
      queryClient.invalidateQueries({ queryKey: listUsersQueryKey });
    },
  })
);

// 使用
createUserMutation.mutate({ name: "John", email: "john@example.com" });
```

### Query Key 管理
```typescript
// 获取 query key 用于缓存管理
const listUsersQueryKey = orpc.dev.listUsers.queryKey({
  input: { page, limit: 10 }
});

// 失效查询
queryClient.invalidateQueries({ queryKey: listUsersQueryKey });
```

关键点：
- 使用 oRPC 的 queryOptions/mutationOptions 获得类型安全
- onMutate 中实现乐观更新，提升用户体验
- onError 中回滚数据，保证一致性
- onSettled 中刷新数据，确保与服务器同步
- 使用 toast 提供用户反馈
```

**packages/capabilities.ts - 功能入口**

```typescript
// 一个文件了解所有能力
export { auth } from "./auth"; // 认证相关
export { db } from "./db"; // 数据库操作
export { payment } from "./payment"; // 支付功能
```

#### 第二优先级：清晰的代码组织

- **Convention over Configuration**
  - 文件命名约定：
    - 所有文件名使用小写字母和中划线：`chat-message.tsx`、`use-auth.ts`
    - 服务端专用：`*.server.ts`
    - 客户端专用：`*.client.tsx`
  - 目录结构约定：`features/[feature-name]/`
  - API 路由约定：与 Next.js 保持一致

- **路径别名**
  ```json
  {
    "@acme/auth": "packages/auth",
    "@acme/db": "packages/db",
    "@/components": "app/components"
  }
  ```

#### 第三优先级：智能注释系统

**AGENT 专属注释**

```typescript
// AGENT: 用户认证入口
// REQUIRES: 数据库连接
// RETURNS: User | null
// ERRORS: AUTH_FAILED, DB_ERROR
export async function signIn() {}
```

**智能错误提示系统**

系统会自动识别错误并生成修复建议，用户可以直接复制执行：

```typescript
// packages/errors/handler.ts

// 1. 错误模式库 - 包含可复制的 prompt
const errorPatterns = [
  {
    pattern: /ECONNREFUSED.*5432/,
    code: "DB_CONNECTION_FAILED",
    message: "数据库连接失败",
    fix: "bun db:push",
    prompt:
      "数据库连接失败，请运行以下命令修复：\nbun db:push\n\n如果问题持续，检查 DATABASE_URL 是否正确配置",
  },
  {
    pattern: /AUTH_SECRET.*undefined/,
    code: "AUTH_SECRET_MISSING",
    message: "认证密钥缺失",
    fix: "openssl rand -base64 32 >> .env",
    prompt:
      "缺少认证密钥，请运行以下命令生成：\nopenssl rand -base64 32 >> .env\n\n然后重启开发服务器",
  },
  {
    pattern: /relation.*does not exist/,
    code: "DB_SCHEMA_OUT_OF_SYNC",
    message: "数据库结构需要更新",
    fix: "bun db:migrate",
    prompt:
      "数据库结构过期，请运行以下命令同步：\nbun db:migrate\n\n或使用 bun db:push 强制同步",
  },
];

// 2. 增强的错误类
export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public fix?: string, // 修复命令
    public prompt?: string, // 完整的用户提示（可复制）
  ) {
    super(message);
  }
}

// 3. 错误处理器
export function handleError(error: unknown): never {
  const errorMessage = error?.message || "";
  const pattern = errorPatterns.find((p) => p.pattern.test(errorMessage));

  if (pattern) {
    // 抛出带有修复建议的错误
    throw new AppError(
      pattern.code,
      pattern.message,
      pattern.fix,
      pattern.prompt,
    );
  }

  // 未知错误
  throw new AppError(
    "UNKNOWN_ERROR",
    errorMessage,
    undefined,
    `遇到未知错误：${errorMessage}\n\n请检查错误信息并参考文档`,
  );
}

// 4. 实际使用
try {
  await db.query.users.findFirst();
} catch (error) {
  handleError(error); // 会抛出 AppError，包含 fix 和 prompt
}

// 用户看到的输出：
// AppError: 数据库连接失败
// Code: DB_CONNECTION_FAILED
// Fix: bun db:push
//
// 💡 复制以下内容到终端：
// ----------------------------------------
// 数据库连接失败，请运行以下命令修复：
// bun db:push
//
// 如果问题持续，检查 DATABASE_URL 是否正确配置
// ----------------------------------------
```

#### 第四优先级：示例驱动

**完整的示例页面**

```
examples/
  ├── auth-flow/        # 完整认证流程
  ├── payment-checkout/ # 支付流程
  └── crud-operations/  # 增删改查
```

**可运行的代码片段**

```typescript
// 每个功能都有 "Copy & Run" 示例
// examples/auth/auth/sign-in.ts
await auth.signIn({
  email: "test@example.com",
  password: "password",
});
```

#### 第五优先级：开发体验

- **类型安全**: 完整的 TypeScript 类型、oRPC 端到端类型安全、Zod schema 验证
- **即时反馈**:
  ```bash
  bun check     # lint + typecheck + test
  bun fix       # 自动修复所有可修复的问题
  ```

## 需要的能力

1. **Monorepo**
   - 非常重要，我们可以把 auth、payment 的逻辑抽离为单独 package，这样可以任何框架都可以复用
2. **DB** - [Drizzle ORM](https://orm.drizzle.team/)
   - 包含数据库 seed 脚本和 Drizzle Studio 可视化工具
3. **Auth** - [Better Auth](https://www.better-auth.com/)
4. **Payment** - [Better Auth Stripe Plugin](https://www.better-auth.com/docs/plugins/stripe)
5. **AI SDK**
   - 集成 [AI SDK Elements](https://ai-sdk.dev/elements/components/actions)
   - 集成 [Prompt Kit](https://www.prompt-kit.com/)
6. **oRPC** - https://orpc.unnoq.com/docs/getting-started
   - 使用 [orpc-openapi](https://orpc.unnoq.com/docs/openapi/openapi-handler) 实现自动 API 文档
7. **Google Analytics**
8. **i18n** - [next-intl](https://next-intl.dev/)
   - 完整的国际化支持，使用 next-intl
   - 消息文件位于 `apps/nextjs/src/i18n/messages/`
   - 支持服务端和客户端组件的共享使用
9. **错误处理标准化**
   - 统一的错误格式，让 agent 容易理解和处理
   - AppError 类，包含 code、message、statusCode
10. **环境变量管理**
    - https://github.com/t3-oss/t3-env
    - 集中管理在 packages/env
    - 带类型和 zod 验证
    - 提供 .env.example 模板
11. **监控和日志**
    - 简单的日志系统，帮助 agent 调试
    - 结构化日志：info、error、warn
12. **测试策略**
    - 只保留关键路径的 E2E 测试
    - 使用 Playwright，配置简单明了
    - 测试文件命名：`.test.ts`（而不是 `.spec.ts`）

## Token 效率

- **模块化边界清晰**：每个 package 职责单一，减少 agent 理解成本
- **Convention over Configuration**：减少配置文件，多用约定
- **示例驱动**：每个功能都有可运行的示例代码
- **预配置 prettier/eslint**：agent 友好的规则，一定要简单不要太严格，否则可能会因为修复 lint error 消耗 token，最好的可能是 nextjs 默认的 eslint rules

## 🎯 Agent 视角：核心痛点与解决方案

### 1. **"我需要快速理解现有能力"**

```typescript
// ❌ Bad: 散落在各处的功能
// ✅ Good: 集中的功能清单
packages / capabilities.ts; // 所有可用功能的单一入口

// 内容示例：
export * from "./auth/actions"; // signIn, signOut, getUser
export * from "./payment/actions"; // createCheckout, handleWebhook
export * from "./ai/actions"; // generateText, streamUI
```

### 2. **"我经常忘记文件位置"**

```typescript
// 路径别名配置
{
  "@auth": "packages/auth",
  "@db": "packages/db",
  "@hooks": "apps/web/src/hooks",
  "@components": "apps/web/src/components"
}

// 让 import 更直观
import { useAuth } from '@auth/client'  // 而不是 '../../../packages/auth/client'
```

### 3. **"我需要快速实现炫酷效果"**

```typescript
// packages/animations/presets.ts
export const animations = {
  fadeIn: "animate-in fade-in duration-500",
  slideUp: "animate-in slide-in-from-bottom-4",
  bounce: "animate-bounce",
  // 预置的复杂动画组合
  heroEntrance: "animate-in fade-in slide-in-from-bottom-8 duration-700 ease-out",
  cardHover: "transition-all hover:scale-105 hover:shadow-2xl duration-300"
}

// 使用时：
<div className={animations.heroEntrance}>
```

### 4. **"我需要知道代码的副作用"**

```typescript
// AGENT: SIDE-EFFECTS: Creates user session, sets cookies
// AGENT: REQUIRES: Database connection
// AGENT: ERROR-CASES: AUTH_FAILED, NETWORK_ERROR
export async function signIn(credentials) {
  // ...
}
```

### 5. **"复制粘贴的代码经常出错"**

```typescript
// apps/web/src/templates/
// 完整的页面模板，可以直接复制使用
├── dashboard-page.tsx      // 包含 layout + auth guard + data fetching
├── landing-page.tsx        // 包含 hero + features + CTA
├── checkout-flow.tsx       // 完整的支付流程
└── ai-chat-interface.tsx   // AI 对话界面
```

## 🚀 Agent 专属优化

### 1. **智能搜索标记**

```typescript
// SEARCHABLE: user authentication, login, signup, oauth
// 让 agent 更容易通过关键词找到相关代码
```

### 2. **依赖关系图**

```yaml
# AGENTS.md
## Feature Dependencies
- Payment → requires Auth
- AI Chat → requires Auth + Rate Limiting
- Admin Panel → requires Auth + Role Check
```

### 3. **代码片段库**

```typescript
// .vscode/agent-snippets.json
{
  "api-route": {
    "prefix": "!api",
    "body": [
      "// AGENT: API endpoint for ${1:purpose}",
      "// METHOD: ${2:POST}",
      "// AUTH: ${3:required}",
      "export async function ${2}(req: Request) {",
      "  ${0}",
      "}"
    ]
  }
}
```

## 结构与说明

### 1. 核心文档：`AGENTS.md`

参考 [https://ampcode.com/AGENTS.md](https://ampcode.com/AGENTS.md#migration)，内容包括：

- **Project Overview**: Brief description of the project’s purpose and architecture
- **Build & Commands**: Development, testing, and deployment commands
- **Code Style**: Formatting rules, naming conventions, and best practices
- **Configuration**: Environment setup and configuration management
- **Common Scenarios**: 常见使用场景的快速指南
- **Debugging Tips**: 调试技巧和常用命令

### 2. Monorepo 结构

注意：ui / tailwind 等不单独设立 package，单独设立对于 shadcn cli 的使用非常不友好

```
packages/
  db/          # Schema + migrations + seed
  auth/        # Better Auth wrapper
  payment/     # Stripe integration
  env/         # 环境变量管理
  ai/          # AI SDK + prompt templates
  analytics/   # GA wrapper

apps/
  web/         # Next.js app
    src/
      features/  # Feature-based organization
      components/
        patterns/  # 预置常见场景的组件组合
      lib/       # Shared utilities
```

### 3. 代码注释规范

每个功能实现都应该包含相应注释（注释给 agent 看的，包括每个功能的简介以及如何使用）

```tsx
// AGENT: This handles user authentication
// Usage: import { auth } from '@/packages/auth'
// Common tasks: signIn(), signOut(), getUser()
```

## 开发工具集成

1. **API Playground** - oRPC + OpenAPI 自动生成的文档
2. **Database Studio** - Drizzle Studio 可视化数据库
3. **Storybook** - UI 组件展示，agent 可以快速理解可用组件

## 部署配置

- **环境变量模板** `.env.example`

## 版本管理

- 使用 **Changesets** 管理包版本
- 自动生成 CHANGELOG
- 语义化版本控制

## 国际化 (i18n) 使用指南

### 使用 next-intl 实现国际化

#### 1. 基础设置
- 消息文件位置：`apps/nextjs/src/i18n/messages/`
  - `en.json` - 英文翻译
  - `zh.json` - 中文翻译
- 路由配置：`apps/nextjs/src/i18n/routing.ts`
- 导航配置：`apps/nextjs/src/i18n/navigation.ts`

#### 2. 在组件中使用

**客户端组件 (Client Components)**
```typescript
"use client";

import { useTranslations } from "next-intl";

export function MyComponent() {
  const t = useTranslations("sections.hero");
  
  return (
    <div>
      <h1>{t("title")}</h1>
      <p>{t("description")}</p>
    </div>
  );
}
```

**服务端组件 (Server Components)**
```typescript
import { getTranslations } from "next-intl/server";

export async function MyServerComponent() {
  const t = await getTranslations("sections.hero");
  
  return (
    <div>
      <h1>{t("title")}</h1>
      <p>{t("description")}</p>
    </div>
  );
}
```

**共享组件 (Shared Components)**
```typescript
// 这个组件可以在服务端或客户端使用
import { useTranslations } from "next-intl";

export function SharedComponent() {
  const t = useTranslations("sections.features");
  
  return <h2>{t("title")}</h2>;
}
```

#### 3. 消息文件结构
```json
{
  "sections": {
    "hero": {
      "title": "Build AI Apps",
      "description": "Full-stack template"
    },
    "features": {
      "items": {
        "auth": {
          "title": "Authentication",
          "description": "Complete auth system"
        }
      }
    }
  }
}
```

#### 4. 嵌套消息访问
```typescript
const t = useTranslations("sections.features");

// 访问嵌套消息
t("items.auth.title"); // "Authentication"
t("items.auth.description"); // "Complete auth system"
```

#### 5. 动态消息
```typescript
// 在消息文件中
{
  "greeting": "Hello {name}!"
}

// 在组件中
t("greeting", { name: "John" }); // "Hello John!"
```

#### 6. 数组消息
```typescript
// 对于数组形式的翻译
const features = ["Feature 1", "Feature 2", "Feature 3"];

// 使用索引访问
t(`features.${index}`);
```

#### 7. 添加新语言
1. 在 `apps/nextjs/src/i18n/messages/` 创建新的语言文件（如 `ja.json`）
2. 更新 `routing.ts` 添加新语言代码
3. 复制现有翻译文件结构并翻译内容

#### 8. 最佳实践
- 保持消息键名简洁且有意义
- 使用嵌套结构组织相关翻译
- 避免在翻译中包含 HTML 标记
- 对于复杂的格式化，使用组件组合而非翻译字符串
- 共享组件优先使用 `useTranslations` 钩子以支持两种渲染模式
