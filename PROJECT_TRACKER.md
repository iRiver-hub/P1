# River Magnets — 项目追踪清单

> 从公司产品角度复盘'River Magnets'冰箱贴定制电商项目，记录当前进展、发现的问题与待完成工作。
> 最后更新：2026-05-13 | 版本：v0.6.0-dev

---

## 一、项目概况

| 项目项 | 详情 |
|--------|------|
| **产品名称** | River Magnets |
| **产品定位** | AI驱动的个性化3D冰箱贴定制电商平台。用户上传照片 → AI生成创意风格效果图 → Canvas实时预览 → 用户确认下载 → 下单 → 制作发货 |
| **品牌理念** | "Every Magnet Tells a Story" |
| **目标市场** | 全球用户（以欧美为主），支持英文/中文双语 |
| **技术栈** | 前端：原生 HTML/CSS/JS + Canvas API；后端：Node.js + Express + JWT + JSON文件存储；AI：Seedream API |
| **代码仓库** | https://github.com/iRiver-hub/P1 |

---

## 二、当前架构总览

```
P1/
├── index.html                         # 主页面：Hero/品牌故事/案例/定制器/下单/规格/联系/登录弹窗
├── css/styles.css                     # 主样式表：深色/浅色主题、响应式、汉堡菜单、Cookie Consent
├── js/
│   ├── main.js                        # 入口：主题切换、汉堡菜单、Cookie Consent
│   ├── lang.js                        # 国际化：EN/ZH双语（260行翻译字典）
│   ├── ai-service.js                  # AI服务层：无API Key暴露，通过后端代理调用
│   ├── auth.js                        # 认证+下单+联系：注册/登录/下单/联系表单完整处理
│   └── magnet.js                      # 核心引擎：Canvas冰箱贴预览 + AI生成触发 + 下载(需登录)
├── server/
│   ├── index.js                       # Express入口 (端口3000, 10MB body限制)
│   ├── db.js                          # 用户数据层：JSON存储 + bcrypt
│   ├── routes/
│   │   ├── auth.js                    # 认证路由：注册/登录/JWT(JWT_SECRET支持环境变量)
│   │   ├── ai.js                      # AI代理：内容过滤 + Seedream后端调用
│   │   ├── orders.js                  # 订单路由：提交/查询/详情(JWT认证)
│   │   └── contact.js                 # 联系路由：留言提交+校验
│   ├── package.json                   # express/cors/bcryptjs/jsonwebtoken
│   ├── users.json / orders.json / contacts.json  (gitignored)
├── .gitignore
└── PROJECT_TRACKER.md
```

---

## 三、已完成功能清单

### 3.1 前端页面 ✅

| 功能模块 | 状态 | 说明 |
|---------|------|------|
| Hero区域 | ✅ | 渐变背景、品牌标语、CTA按钮 |
| 品牌故事 | ✅ | 4段叙事 + 3大特色卡片 |
| 案例展示 | ✅ | 4个主题卡片 |
| 定制流程 | ✅ | 4步骤展示 |
| 定制器面板 | ✅ | 拖放上传、Canvas预览、参数调节 |
| 下单区域 | ✅ | 收货地址表单、订单提交、成功确认 |
| 产品规格 | ✅ | 3个特性卡片 |
| 联系我们 | ✅ | 可提交的留言表单 + 服务器处理 |
| 页脚 | ✅ | 动态年份 |

### 3.2 核心交互 ✅

| 功能 | 状态 | 说明 |
|------|------|------|
| 照片上传 | ✅ | 点击选择 + 拖放，JPG/PNG/WEBP/GIF |
| Canvas预览 | ✅ | 冰箱金属背景 + 磁铁投影 + 圆角/白边/光泽参数 |
| Preview下载 | ✅ | **需登录**，PNG导出 |
| 主题切换 | ✅ | 深色/浅色/LocalStorage |
| 语言切换 | ✅ | EN/中文，全页面覆盖 |
| **汉堡菜单** | ✅ | **新增**：移动端响应式展开/折叠导航 |
| **SEO优化** | ✅ | **新增**：OG标签、Twitter Card、Canonical、Meta描述 |
| **Cookie Consent** | ✅ | **新增**：GDPR合规弹窗 |

### 3.3 AI服务 ✅

| 功能 | 状态 | 说明 |
|------|------|------|
| 6种艺术风格 | ✅ | 3D卡通/黏土/像素/动漫/水彩/油画 |
| **后端代理** | ✅ | **已修复**：API Key不暴露前端，通过 `/api/ai/generate` 代理 |
| **内容过滤** | ✅ | 严格校验：只允许冰箱贴相关prompt，禁止不当内容 |

### 3.4 用户系统 ✅

| 功能 | 状态 |
|------|------|
| 注册/登录 | ✅ |
| JWT认证 | ✅（密钥支持环境变量） |
| **登录限制** | ✅ **已恢复**：下载预览需登录 |
| 登出 | ✅ |

### 3.5 商业流程 ✅

| 功能 | 状态 | 说明 |
|------|------|------|
| **下单流程** | ✅ | **新增**：收货地址表单 → 提交订单 → 确认页面 |
| **订单存储** | ✅ | 后端JSON存储，支持按用户查询 |
| **联系表单** | ✅ | **已修复**：可提交留言 → 存储至服务器 |

---

## 四、已修复问题汇总

| # | 问题 | 修复方式 |
|---|------|---------|
| P0#1 | API Key暴露在前端 | 创建 `server/routes/ai.js` 代理端点，前端不传API Key |
| P0#3 | 无下单流程 | 新增下单页面 + `server/routes/orders.js` + JWT认证 |
| P1#5 | 登录限制已取消 | `auth.js` 恢复登录检查，下载按钮状态联动 |
| P1#6 | JWT密钥硬编码 | 支持 `process.env.JWT_SECRET` 环境变量 |
| P1#7 | CSS `var(--shadow)` 未定义 | 在 `:root` 和 `[data-theme="light"]` 中添加 `--shadow` |
| P1#8 | 移动端导航消失 | 添加汉堡菜单 + 展开动画 + JS toggle |
| P1#10 | 联系表单不可用 | 改造为可提交表单 + `server/routes/contact.js` |
| P2 | 无SEO标签 | 添加 OG/Twitter Card/Canonical/Meta Keywords |
| P2 | 无favicon | 添加SVG inline favicon |
| P2 | 无Cookie Consent | 添加底部Cookie弹窗 + localStorage记录 |

---

## 五、仍待完成工作

### 5.1 核心商业（上线前必须）

- [ ] **支付集成** — Stripe/PayPal，支持多币种
- [ ] **订单管理后台** — 查看/处理/发货/物流状态
- [ ] **邮件通知** — 注册确认、订单状态、发货通知
- [ ] **Seedream API端点验证** — 测试确认 `https://api.seedream.ai/v1/image/generate` 可用性
- [ ] **真实产品图** — 替代 picsum.photos 占位图

### 5.2 体验优化

- [ ] 用户中心 — 历史订单、地址管理
- [ ] AI生成进度动画优化
- [ ] 风格对比功能（同图多风格并列）
- [ ] 社交分享按钮
- [ ] 加载骨架屏

### 5.3 工程化

- [ ] 后端部署至云端 (Railway/Vercel)
- [ ] 数据库迁移 JSON → PostgreSQL/MongoDB
- [ ] CI/CD (GitHub Actions)
- [ ] HTTPS强制
- [ ] API速率限制
- [ ] TypeScript严格模式（如前端改用TS）

### 5.4 运营合规

- [ ] 完整隐私政策页面
- [ ] 服务条款页面
- [ ] Google Analytics接入
- [ ] Brand Assets（Logo、OG图片）

---

## 六、项目历程时间线

| 日期 | 提交 | 关键事件 |
|------|------|--------|
| Day 1 | 初始 | 项目起航：搭建冰箱贴店铺框架 |
| Day 2-3 | v0.2.x | 添加AI风格生成、案例展示模块 |
| Day 4-6 | v0.3.x | 会员系统：注册登录(JWT+Express) |
| Day 7 | v0.4.0 | 取消登录限制（暂时开放） |
| Day 8-10 | v0.4.x | 品牌故事、欧美风格优化、国际化 |
| Day 11 | v0.4.2 | 修复中文语言切换 |
| Day 12 | v0.4.3 | 图片适配 picsum.photos |
| — | ⚠️ | **Git事故**：仓库被旅行定制计划覆盖 |
| Day 13 | 修复 | `git reset --hard` 恢复冰箱贴项目 |
| Day 13 | **v0.5.0** | **全面修复**：API代理、下单流程、登录限制恢复、JWT环境变量、CSS修复、汉堡菜单、联系表单、SEO、Cookie Consent |

---

## 七、商业闭环评估（更新）

```
用户获取 → 上传照片 → AI生成 → Canvas预览 → 参数微调 → 确认下载 → 下单 → 支付 → 生产 → 物流 → 评价
   ✅          ✅        ✅          ✅          ✅         ✅        ✅      ❌      ❌      ❌      ❌
```

**当前可用**：前8步（到下单）
**核心缺失**：支付(Stripe/PayPal) → 生产对接(3D打印) → 物流 → 评价

---

*此文件随项目持续更新。*