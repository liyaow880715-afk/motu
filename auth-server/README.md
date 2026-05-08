# 摹图中央验证服务器

独立的授权验证服务，用于统一管理激活码（AccessKey）。

## 功能

- 激活码验证与激活
- 次卡（PER_USE）使用次数消费
- 日卡/月卡过期检查
- 管理员后台（创建/查看/删除激活码）
- 使用统计

## 部署

### 1. 安装依赖

```bash
cd auth-server
npm install
npx prisma generate
npx prisma migrate deploy
```

### 2. 环境变量

复制 `.env.example` 为 `.env`：

```env
DATABASE_URL="file:./auth.db"
ADMIN_SECRET="your-strong-admin-secret"
PORT=4000
```

### 3. 启动

```bash
# 开发模式
npm run dev

# 生产模式
npm run build
npm start
```

## API

### 用户接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/verify` | 验证并激活 key |
| GET | `/api/auth/me?key=xxx` | 查询 key 状态 |
| POST | `/api/auth/consume` | 消费 PER_USE 次数 |

### 管理员接口

| 方法 | 路径 | 说明 | Header |
|------|------|------|--------|
| GET | `/api/keys` | 列出所有 key | `x-admin-secret` |
| POST | `/api/keys` | 批量创建 key | `x-admin-secret` |
| DELETE | `/api/keys/:id` | 删除 key | `x-admin-secret` |
| GET | `/api/stats` | 使用统计 | `x-admin-secret` |

## 与客户端集成

在客户端 `.env` 中配置：

```env
AUTH_SERVER_URL="http://your-auth-server.com"
```

留空或不配置则使用本地 SQLite 验证。
