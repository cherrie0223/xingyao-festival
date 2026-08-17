# 星耀中国·万里同月 — 公网部署指引

> 本活动网页是 **Node.js 后端**（不是纯静态页），所以像 CloudStudio 那种「只托管 HTML」的平台跑不起来。
> 需要能运行 Node 的环境。下面按「省事程度」从易到难给出三套方案，任选其一。

---

## ⚠️ 部署前必读（三个关键点）

1. **必须设置后台口令** `ADMIN_TOKEN`
   不设置的话，任何人访问你的域名 + `/admin` 就能下载全员照片和留言。
   上线前一定用 `ADMIN_TOKEN=一段强口令 node server.js` 启动，后台与图片下载就会要求 `?token=强口令`。
2. **数据放在本地磁盘**（`./data/data.json` 和 `./uploads/`）
   云平台上如果容器每次重启都重建，上传记录会丢。请用平台提供的「持久卷 / Disk」把这两个目录挂上去。
3. **端口**：服务默认 `3000`，云平台通常用环境变量 `PORT` 注入，代码已支持 `process.env.PORT`。

---

## 方案一：Render（最省事，推荐）

1. 打开 https://render.com ，用 GitHub 登录。
2. 把 `wanlan-festival/` 整个目录推到一个 GitHub 仓库（或本地 `git init` 后推上去）。
3. 在 Render 控制台 New → Web Service → 关联该仓库。
4. 配置：
   - **Build Command**：留空（零依赖，无需安装）
   - **Start Command**：`npm start`
   - **Instance Type**：选最便宜的 `Free` 即可（活动期间够用）
5. 展开 **Advanced → Add Environment Variable**，加两条：
   - `PORT` = `3000`（Render 会用它自身分配的端口覆盖，这里填不填都行，代码兼容）
   - `ADMIN_TOKEN` = `一段只有你们知道的强口令，例如 Wanli2026@Moon`
6. 点 Create，等一分钟后会给一个 `.onrender.com` 域名。
7. 把这个域名发给各站同事，访问即主页；总部访问 `域名/admin?token=你的强口令` 下载素材。
8. **持久化**：Render 免费版磁盘非持久，重启会丢数据。若要稳妥，升级付费或把 `data/`、`uploads/` 挂 Persistent Disk。

---

## 方案二：Railway（也简单，部署快）

1. 打开 https://railway.app ，GitHub 登录。
2. New Project → Deploy from GitHub repo，选你的仓库。
3. 默认会识别 `npm start`，自动启动。
4. Variables 里加 `ADMIN_TOKEN`（同上）。
5. 生成域名后发给各站。
6. 持久卷：Railway 可在项目里挂 Volume，把 `/data` 和 `/uploads` 映射进去。

---

## 方案三：自有服务器 / 公司内网 VPS（最可控）

适合有自己服务器、想长期保留数据的场景。

```bash
# 1. 把 wanlan-festival 传到服务器（scp 或 git clone）
# 2. 安装 Node 18+（已装可跳过）
# 3. 用 pm2 守护进程，断线/崩溃自动重启
npm install -g pm2
ADMIN_TOKEN='你的强口令' pm2 start server.js --name xingyao

# 4. 如需用 80/443 域名访问，前面加 nginx 反代：
```

nginx 片段（`/etc/nginx/conf.d/xingyao.conf`）：
```nginx
server {
    listen 80;
    server_name 你的域名;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
    }
}
```
改完 `nginx -t && systemctl reload nginx`。再把域名解析（A 记录）指到服务器 IP。

---

## 临时方案：内网穿透（只想先测几天）

本地电脑跑着服务，用工具把 `localhost:3000` 暴露到公网：
- **Cloudflared**：`cloudflared tunnel --url http://localhost:3000`
- **ngrok**：`ngrok http 3000`
会给你一个临时公网地址，发给各站即可。**注意：电脑关机服务就断，且同样要设 `ADMIN_TOKEN`。**

---

## 上线检查清单

- [ ] 服务能启动（`npm start` 或 `node server.js`）
- [ ] 首页能打开、地图六站可见、上传/点亮/灯谜/星光点全链路跑通
- [ ] 已设置 `ADMIN_TOKEN`，`/admin` 无 token 返回 403
- [ ] 数据目录 `data/`、`uploads/` 已挂持久卷（云平台）
- [ ] 域名已发给各站，活动时间窗内服务保持运行
- [ ] 活动结束后，总部进 `/admin?token=...` 下载图片 zip + 导出 CSV，制作明信片
