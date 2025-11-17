# 归家十二分 - AI 砍价守门员

一个基于 AgentStart 框架构建的智能砍价 agent 应用，用户可以通过与 AI 对话进行互动式砍价游戏。

## 功能特性

### 智能砍价对话
- 与 AI 守门员进行趣味性砍价对话
- AI 会根据你的聊天内容评估"好感度"（0-61+分）
- 好感度越高，价格优惠越大（¥20.99 → ¥9.99）
- 评分维度包括：创意、真诚度、逻辑性

### 动态价格生成
- Agent 根据好感度自动生成购买链接
- 每次价格变动时自动调用工具生成新链接
- 价格范围：¥20.99（初始）到 ¥9.99（最低）

### 分享功能
- 点击分享按钮可生成精美的价格展示截图
- 截图展示最终砍价后的优惠价格
- 包含首页二维码，方便好友扫码参与砍价
- 支持分享到朋友圈/社群进行传播

## 快速开始

### 环境要求

- Node.js 18+
- pnpm 9+（管理依赖）
- PostgreSQL 数据库

### 安装依赖

```bash
pnpm install
```

### 环境变量配置

创建 `.env` 文件并配置以下必需变量：

```bash
# AI 模型 API Key（必需）
MODEL_PROVIDER_API_KEY=your_openrouter_api_key

# 数据库连接（必需）
DATABASE_URL=postgresql://user:password@host:port/database

# Blob 存储配置（可选，三选一）
# Vercel Blob
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...

# AWS S3
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_S3_BUCKET=your_bucket_name
AWS_REGION=us-east-1

# Cloudflare R2
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_NAME=your_bucket_name
R2_ACCOUNT_ID=your_account_id

# Redis（可选，用于生产环境的辅助存储）
REDIS_URL=redis://localhost:6379
```

### 数据库初始化

```bash
# 推送数据库 schema
pnpm run db:push
```

### 启动开发服务器

```bash
pnpm run dev
```

应用将在 `http://localhost:3000` 启动。

## 构建与部署

### 本地构建

```bash
pnpm run build
```

### 预览生产构建

```bash
pnpm run serve
```

### 部署到 Cloudflare Pages

```bash
pnpm run deploy
```

## 技术栈

- **框架**: AgentStart - 开箱即用的 AI Agent 开发框架
- **前端**: React + TanStack Router
- **构建工具**: Vite
- **样式**: Tailwind CSS
- **UI 组件**: Base UI Components
- **AI 模型**: OpenRouter (x-ai/grok-4-fast)
- **数据库**: PostgreSQL + Drizzle ORM
- **Blob 存储**: Vercel Blob / AWS S3 / Cloudflare R2（可选）
- **类型检查**: TypeScript
- **代码质量**: Biome

## 开发工具

### 代码检查与格式化

```bash
# 运行 linter 并自动修复问题
pnpm run lint

# 类型检查
pnpm run typecheck
```

### 测试

```bash
# 运行测试
pnpm run test
```

## 项目结构

```
apps/bargain/
├── src/
│   ├── components/      # UI 组件
│   │   ├── agent/      # Agent 相关组件
│   │   └── ui/         # 基础 UI 组件
│   ├── routes/         # TanStack Router 路由
│   ├── lib/            # 核心逻辑
│   │   ├── agent.ts    # Agent 配置
│   │   └── instructions.ts  # Agent 指令和规则
│   └── db/             # 数据库配置和 schema
├── public/             # 静态资源
└── README.md
```

## Agent 配置

### 价格阶梯表

| 好感度 | 最低价格 |
|--------|----------|
| 0-8    | ¥20.99   |
| 9-18   | ¥18.99   |
| 19-28  | ¥16.99   |
| 29-38  | ¥14.99   |
| 39-60  | ¥11.99   |
| ≥61    | ¥9.99    |

### 评分标准

Agent 根据以下标准评估每轮对话的好感度（0/2/4/6/8/10 分）：

- **10 分**: 近乎完美的创意+真诚+逻辑
- **8 分**: 至少一个维度突出（创意/真诚）
- **6 分**: 有效但不出彩，理由合理
- **4 分**: 模板化/敷衍
- **2 分**: 极端敷衍
- **0 分**: 重复理由或编造苦难

## 自定义配置

### 修改 Agent 指令

编辑 `src/lib/instructions.ts` 来自定义 Agent 的行为、规则和人设。

### 修改价格表

在 `src/lib/instructions.ts` 中调整价格阶梯表来改变优惠策略。

### 更换 AI 模型

在 `src/lib/agent.ts` 中修改 `openrouter()` 调用来切换不同的 AI 模型。

## 贡献指南

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT

---

基于 [AgentStart](https://github.com/agentstart) 框架构建
