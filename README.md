# 账单簿 Billflow — 多用户云端版

在线收支管理应用，适���多人分别注册并使用各自账本。包括邮箱/密码注册登录、账单增删改、分类、CSV/Excel 导入、截图 OCR、月报和图表。生产部署使用 PostgreSQL 持久化数据库；账单负载在写入数据库前用 AES-256-GCM 加密，密码以 bcrypt 哈希保存，账单 API 根据登录用户隔离数据。

## 部署到 Render

仓库提供 `render.yaml` Blueprint。部署需要你本人登录 Render 并授权 GitHub 仓库；我无法代你授权第三方账户或启动云服务。

1. 打开 Render Dashboard，选择 **New → Blueprint**。
2. 连接 GitHub，并选中 `pagn00/billflow` 仓库及 `main` 分支。
3. 检查 Blueprint 会创建一个 Starter Web Service 和一个 Basic PostgreSQL 数据库。数据库与服务是付费资源；部署前请在 Render 页面核对当前价格和区域。
4. 确认部署。Render 自动生成 `JWT_SECRET`、`ENCRYPTION_KEY`，将数据库连接串注入服务。
5. 部署成功后，打开 Render 服务给出的 `https://...onrender.com` 地址，注册账号即可使用。可通过 `/api/health` 检查服务和数据库状态。

不要将 `.env`、生产密钥或数据库连接串提交到 Git，也不要把密钥发给他人。不要更换已经在用的 `ENCRYPTION_KEY`，否则现有加密账单无法解密。

## 本地运行

需要 Node.js 20+ 和本地 PostgreSQL：创建名为 `billflow` 的数据库，然后：

```sh
cp .env.example .env
# 编辑 .env，设定高熵随机 JWT_SECRET 与 ENCRYPTION_KEY，并确认 DATABASE_URL
npm install
npm start
```

打开 `http://localhost:3000`。开发用默认示例密钥仅限本机试运行，不能用于生产。

## 扩容与运行边界

API 服务是无状态的，多个 Web 实例可连接同一 PostgreSQL 数据库；Render Blueprint 提供一个基础实例和托管 PostgreSQL，能服务普通小型多用户应用。实际并发能力取决于套餐、数据库容量、连接池和导入量。高流量上线前应压测并按指标升级数据库/实例、配置连接池上限和数据库备份/恢复演练。此仓库不代表已完成独立安全审计或高可用 SLA。

OCR、Excel 和图表组件在浏览器端通过 CDN 加载，因此用户浏览器需要能访问 jsDelivr；识别结果必须人工核对。当前未接入支付机构 API、邮箱验证、找回密码、管理员后台或端到端加密。部署前请根据面向公众的服务要求补齐隐私声明、服务条款、备份和监控。
