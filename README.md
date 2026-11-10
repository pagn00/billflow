# 账单簿 Billflow

在线账单管理 Web App：注册/登录、账单增删改、CSV/Excel 导入、截图 OCR、自动分类、月度趋势图和 CSV 导出。账单按用户隔离，内容通过 AES-256-GCM 加密后存储，密码使用 bcrypt 哈希。

## 一键部署到 Render

本仓库包含 `render.yaml` Blueprint 配置。部署前请先在 Render 连接 GitHub 并授权访问 `pagn00/billflow`：

1. 登录 Render，选择 **New → Blueprint**，选择这个 GitHub 仓库。
2. Render 读取 `render.yaml` 并创建 Web Service 和持久化磁盘；确认并部署。
3. 等待构建成功，在 Render 服务页面打开 `https://<服务名>.onrender.com`。
4. 首次使用点击“注册”，创建账户即可开始记账。

Render Blueprint 自动生成 `JWT_SECRET` 和 `ENCRYPTION_KEY`，数据库文件存放在挂载的 `/var/data` 持久盘。该配置使用 Render 的 Starter Web Service 和 1 GB 持久盘，属于付费资源；账单和数据库依赖持久盘，不能改成临时文件系统。上线前在 Render 的服务页确认当前套餐价格。

若不使用 Blueprint，可用 Node.js 20+ 部署：Build `npm install --omit=dev`，Start `npm start`。必须设置 `NODE_ENV=production`、强随机 `JWT_SECRET`、强随机 `ENCRYPTION_KEY`、`DATABASE_PATH`（指向持久化磁盘）。不要把密钥提交到 Git。生产环境无持久盘时，重启/重新部署可能丢失 SQLite 数据。

## 本地运行

```bash
cp .env.example .env
# 编辑 .env，设置随机密钥；开发模式可使用示例路径
npm install
npm start
```

然后访问 http://localhost:3000。建议用密码管理器生成随机密钥；不要在部署间更换 `ENCRYPTION_KEY`，否则已保存的账单将无法解密。

## 功能与数据说明

- 个人账号与登录；每个账单操作都按登录用户 ID 限定。
- 手动记账、编辑、删除，按月份筛选，按备注/分类搜索。
- 分类：餐饮、交通、购物、住房、医疗、娱乐、工资、奖金、转账、其他；可手动调整。
- CSV/Excel 文件解析和截图 OCR（浏览器端处理，依赖 jsDelivr 网络资源）；核对识别结果后再导入。
- 月度收入、支出、结余，近六个月趋势、分类环图；支持导出 CSV。
- 数据由服务端加密后保存，HTTPS 由 Render 提供。仍应定期导出备份；忘记密码可通过登录页面提示重置账户密码的功能尚未提供。

## 上线注意事项

云端服务创建需要你在 Render 登录并授权 GitHub 仓库；我无法代你接受第三方平台条款、授权账号、填写付款资料或启动云服务。因此，仅提交配置还不等于公网实例已创建。请不要向任何人发送 Render 密码或部署密钥。注册上线后可在应用地址直接创建账号使用。
