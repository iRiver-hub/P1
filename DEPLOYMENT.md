# P1 / River Magnets 生产部署方案

> 状态：可执行，分 **最小可行方案（MVP）** 与 **推荐扩展方案** 两档。当前代码基于 Express + sql.js 内存数据库 + 本地文件存储，生产迁移需先决定用哪一档。

---

## 1. 当前架构约束

| 组件 | 现状 | 生产瓶颈 |
|------|------|----------|
| 前端 | 纯静态 HTML/CSS/JS（`index.html`、`admin/`、`user-center.html`） | 目前由后端 `SERVE_STATIC=true` 一起 serve；可拆分 CDN |
| 后端 | Express + Node.js | 无状态，可水平扩展 |
| 数据库 | `sql.js` 内存 SQLite，写操作触发 `fs.writeFileSync` 持久化到 `server/data/river.db` | **单实例才能保持一致性**；多实例会互相覆盖 |
| 文件存储 | 用户上传 / AI 生成图片写入 `server/data/images/` | 多实例无法共享；容器重启或滚动更新会丢数据（除非挂载持久卷） |
| 支付 | Stripe Checkout + webhook | 依赖 Stripe 密钥与公网可访问的 webhook endpoint |
| 邮件 | Resend | 依赖 `RESEND_API_KEY` |
| AI | 字节豆包 Seedream | 依赖 `SEEDREAM_API_KEY` |

**结论**：如果不改数据库/文件存储，生产只能跑 **单实例 + 持久卷**。想做多实例高可用，必须先把 sql.js 换成 PostgreSQL、把本地图片换成 S3/R2 兼容对象存储。

---

## 2. 推荐方案 A：单实例 + 持久卷（MVP，改动最小）

适合早期冷启动：订单量低、不要求 99.99% 可用性、想尽快上线。

```
[User]
  │
  ▼
[Cloudflare / Vercel Edge]  ← 前端静态页面 (index.html / admin / user-center)
  │  JS 请求 window.API_BASE = https://api.rivermagnets.com/api
  ▼
[Render / Railway / Fly.io]  ← 单实例 Node.js + 持久卷
  │
  ├── server/data/river.db   (持久卷)
  └── server/data/images/    (持久卷)
```

### 2.1 为什么单实例可行

- `sql.js` 在内存里跑，所有读写通过同一个进程完成，天然一致。
- 只要挂载持久卷，数据库文件和图片在重启/部署后不丢失。
- 部署时先停止旧实例 → 启动新实例 → 挂载同一卷，数据连续。

### 2.2 平台选择

| 平台 | 优点 | 注意 |
|------|------|------|
| **Railway** | 一键 Git 部署、自带磁盘、自动 HTTPS、域名简单 | 需要添加 Persistent Volume |
| **Render** | 有 Web Service + Disk，免费额度够用 | 免费实例会休眠，不适合严肃生产 |
| **Fly.io** | 支持 `fly volumes`、全球边缘、按量计费 | 配置略复杂 |
| **VPS (Hetzner / DigitalOcean)** | 最便宜、完全可控 | 需自己管 Nginx、HTTPS、备份、监控 |

### 2.3 Railway 部署步骤（推荐 MVP）

1. 在 Railway 创建项目，连接 `iriver-hub/P1` 仓库。
2. 添加服务时指定 **Root Directory**：`server`（不要整个仓库，因为 `package.json` 在 `server/`）。
3. 添加 **Persistent Volume**，挂载路径填 `/app/data`（或 Railway 默认卷路径）。
   - 然后 Railway 的环境变量里加：
     ```
     DATA_DIR=/app/data
     ```
   - 但当前代码写死 `DATA_DIR = path.join(__dirname, "..", "data")`，即 `server/data`。要么让代码支持 `DATA_DIR` 环境变量，要么把卷挂载到 `server/data`。
4. 启动命令：`node index.js`（Railway 默认从 `package.json` 的 `scripts.start` 读取）。
5. 设置环境变量（见第 5 节完整清单）。
6. 生成域名：`https://your-api.up.railway.app`。
7. 前端部署到 GitHub Pages（见第 4 节），`js/api-base.js` 已指向 `https://api.rivermagnets.com/api`，需要改成你的 Railway 域名。

### 2.4 数据持久化关键点

- 数据库文件：`server/data/river.db` 必须落在卷上。
- 图片文件：`server/data/images/` 必须落在卷上。
- 如果部署平台滚动更新时同时启动两个实例（蓝绿），会短暂出现双写。确认平台部署策略为 **single replica + rolling replace**，或者部署时手动关闭旧实例。
- **备份**：每天定时把 `river.db` 和 `images/` 复制到 S3/R2。见第 7 节。

---

## 3. 推荐方案 B：多实例 + PostgreSQL + 对象存储（真正可扩展）

适合订单量增长、需要高可用、计划全球部署。

```
[User]
  │
  ▼
[Cloudflare Pages / Vercel]  ← 前端 + CDN
  │  JS 请求 https://api.rivermagnets.com/api
  ▼
[Cloudflare Load Balancer / AWS ALB]
  │
  ├── [Node.js 实例 1] ──┐
  ├── [Node.js 实例 2] ──┼── [PostgreSQL] (managed)
  └── [Node.js 实例 3] ──┘
                           [S3 / R2 Bucket]  ← 图片/生产包
```

### 3.1 需要改动的代码

1. **数据库层**  
   把 `server/db/database.js` 从 `sql.js` 迁移到 `pg`：
   - 使用 `Pool`。
   - 所有 `run/get/all/runReturning` 用参数化查询。
   - 替换 `migrateSchema` / `seedDefaults` / `migrateFromJson` 为 `pg` 版本。
   - 建议用 `node-pg-migrate` 或 `dbmate` 管理 schema 迁移。

2. **文件存储层**  
   把 `designStore.saveDataUri` / `readImageAsDataUri` 抽象为存储接口：
   - 本地实现：`LocalStorage`（当前）。
   - 生产实现：`S3Storage`（R2/S3/MinIO）。
   - 上传时保存到 bucket，返回 `s3://bucket/<key>` 或 URL；读取时通过预签名 URL 或公开 bucket 返回。

3. **会话/图片路由**  
   `/api/designs/sessions/:id/images/:filename` 如果文件在对象存储，直接 302 跳转到对象存储 CDN URL。

4. **环境变量**  
   增加 `DATABASE_URL`、`S3_ENDPOINT`、`S3_BUCKET`、`S3_ACCESS_KEY`、`S3_SECRET_KEY`。

### 3.2 推荐服务商组合

| 组件 | 推荐 | 理由 |
|------|------|------|
| 前端托管 | **Cloudflare Pages** | 免费、全球 CDN、自定义域名、HTTPS 自动 |
| 后端托管 | **Railway / Render / Fly.io** | 多实例、自动部署、健康检查 |
| 数据库 | **Railway Postgres / Supabase / Neon** | 托管 Postgres、自动备份 |
| 对象存储 | **Cloudflare R2** | 零 egress 费、S3 兼容、便宜 |
| CDN | **Cloudflare** | 前端 + 图片缓存、DDoS 保护 |
| 域名 | **Cloudflare Registrar** | 一站式 DNS + HTTPS |

---

## 4. 前端部署（必须拆分）

当前 `js/api-base.js` 已经做了按域名自动选择 API：

```js
if (loc.hostname.includes("github.io")) {
  return "https://api.rivermagnets.com/api";
}
```

### 4.1 GitHub Pages 部署

1. 在仓库 Settings → Pages → Source 选择 `main` 分支 `/ (root)`。
2. 把 `api-base.js` 里的 `https://api.rivermagnets.com/api` 改成你的真实 API 域名。
3. 提交后访问 `https://iriver-hub.github.io/P1/`。
4. 环境变量：
   ```
   SERVE_STATIC=false
   CORS_ORIGINS=https://iriver-hub.github.io
   ```

### 4.2 Cloudflare Pages / Vercel 部署

更推荐，因为：
- 自定义域名更简单。
- 缓存策略更好。
- 可设置 `/_headers` 或 `vercel.json` 做安全响应头。

步骤：
1. 连接 Git 仓库，构建命令留空，输出目录填 `/`（根目录就是静态文件）。
2. 自定义域名：`rivermagnets.com`。
3. 后端 `CORS_ORIGINS` 设为 `https://rivermagnets.com`。

---

## 5. 环境变量清单

当前 `.env.example` 已覆盖大部分。生产部署务必修改：

```env
NODE_ENV=production
PORT=3000
SERVE_STATIC=false

# 安全：生成 >= 32 字符随机串
JWT_SECRET=xxx
ADMIN_KEY=xxx
ADMIN_USERNAME=admin
ADMIN_PASSWORD=xxx

# 业务 API
SEEDREAM_API_KEY=xxx
SEEDREAM_ENDPOINT=https://ark.cn-beijing.volces.com/api/v3
SEEDREAM_MODEL=doubao-seedream-4-5-251128

# 支付（可选但不配则只能后台手动改 paid）
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# 邮件
RESEND_API_KEY=re_xxx
EMAIL_FROM=River Magnets <noreply@rivermagnets.com>

# URL
APP_URL=https://rivermagnets.com
API_URL=https://api.rivermagnets.com
CORS_ORIGINS=https://rivermagnets.com,https://admin.rivermagnets.com

# 方案 B 才需要
# DATABASE_URL=postgresql://...
# S3_ENDPOINT=...
# S3_BUCKET=...
# S3_ACCESS_KEY=...
# S3_SECRET_KEY=...
```

**注意**：
- 当前代码会校验 `JWT_SECRET` 长度必须 ≥ 32，否则启动失败。
- `ADMIN_KEY` 必须 ≥ 32，密码必须 ≥ 8。
- 生产绝不能用 `ADMIN_PASSWORD=admin` 或类似弱口令。

---

## 6. 数据库迁移（从 sql.js 到 PostgreSQL）

如果执行方案 B，推荐迁移步骤：

1. 新建 PostgreSQL 数据库。
2. 用当前 `server/db/database.js` 中的 `SCHEMA` 创建表，并把 `migrateSchema`、`seedDefaults` 脚本转成 `.sql` 文件。
3. 写一次性导出脚本：
   ```js
   const oldDb = require('./db/sqlite-export'); // 读取 river.db
   const newDb = require('./db/pg');
   ```
4. 导出 `users`、`orders`、`order_items`、`shipments`、`payments`、`contacts`、`audit_logs`。
5. 验证订单数量、金额、状态一致后切换 `DATABASE_URL`。
6. 保留 `river.db` 备份 30 天。

---

## 7. 备份与恢复

### 7.1 单实例方案备份

```bash
# 每天 3 AM 备份到 R2/S3
#!/bin/bash
DATE=$(date +%Y%m%d-%H%M%S)
DB=server/data/river.db
IMG=server/data/images
aws s3 cp "$DB" s3://rivermagnets-backups/db/river-$DATE.db
aws s3 sync "$IMG" s3://rivermagnets-backups/images/$DATE/
```

- 保留最近 7 天 + 最近 12 个月。
- 在 Railway 可用 Cron service 或 GitHub Actions 定时执行。

### 7.2 恢复

```bash
# 停机恢复
aws s3 cp s3://rivermagnets-backups/db/river-xxx.db server/data/river.db
aws s3 sync s3://rivermagnets-backups/images/xxx/ server/data/images/
```

---

## 8. 监控与日志

| 层级 | 工具 | 检查项 |
|------|------|--------|
| 可用性 | UptimeRobot / Pingdom | `GET /api/health` 200 |
| 日志 | Railway / Render 自带 或 Logtail | 错误率、AI 失败、Stripe webhook 失败 |
| 性能 | 平台 metrics 或 Prometheus | 响应时间、CPU、内存、磁盘 |
| 业务 | 自建 dashboard 或 Amplitude | 订单转化率、AI 生成成功率 |

健康检查端点已存在：
```bash
curl https://api.rivermagnets.com/api/health
```

---

## 9. 安全上线检查清单

- [ ] 生产环境变量全部填入，无 `localhost` 残留。
- [ ] `JWT_SECRET`、`ADMIN_KEY` 为 ≥ 32 字符随机串。
- [ ] `ADMIN_PASSWORD` 为强密码，且非默认。
- [ ] `SERVE_STATIC=false`，前端走 CDN/GitHub Pages。
- [ ] `CORS_ORIGINS` 仅包含生产域名，不含 `*` 或 `localhost`。
- [ ] Stripe webhook 使用 `STRIPE_WEBHOOK_SECRET` 验证签名。
- [ ] 数据库/图片卷已挂载并持久化。
- [ ] 备份任务已配置并验证成功。
- [ ] `/api/dev` 路由在生产环境未加载（已通过 `NODE_ENV` 控制）。
- [ ] 静态文件保护已验证：`server/.env`、`server/data/river.db` 返回 404。
- [ ] 限流已启用，登录/注册单独限流。

---

## 10. 部署顺序建议

1. **先选方案 A 上线**（改动最小，验证完整购物流程）。
2. 跑 1-2 周真实订单，确认 Stripe、AI、邮件、生产包导出都正常。
3. 同时后台准备方案 B：迁移 PostgreSQL + R2。
4. 低峰期切换方案 B，实现多实例高可用。

---

## 附录：已验证的命令

```bash
# 本地启动
cd server
node index.js

# 订单链路测试（需服务器已运行）
node scripts/test-order-flow.js

# 健康检查
curl http://localhost:3000/api/health
```
