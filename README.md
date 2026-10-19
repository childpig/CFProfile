# CFProfile — 个人主页 / 导航页模板

一个部署在 Cloudflare Pages 上的极简个人主页模板：单页静态站点 + Pages Functions 中间件注入环境变量，网站名、介绍、页脚、网址卡片、社交链接全部通过「一个」环境变量 `SITE_CONFIG` 配置，无需改代码。

在线示例：<https://cfprofile.pages.dev>

## 功能

- 单页静态站点（`index.html`），无构建步骤，无依赖
- `functions/_middleware.js` 在响应阶段把环境变量注入 HTML 占位符
- 所有个性化内容收敛为一个变量 `SITE_CONFIG`（JSON 对象）
- 页脚齿轮打开「设置」面板，可视化编辑各项目 → 一键导出 JSON → 粘贴到 Cloudflare 面板即可
- 未配置的字段走中立默认值或自动隐藏，不会露出示例站信息

## 快速部署（3 分钟）

1. **Fork 本仓库**到你的 GitHub 账号。

2. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com) → **Workers & Pages** → **Pages** → **Create a project** → **Connect to Git**，选择刚 Fork 的仓库：
   - **Framework preset**：`None`
   - **Build command**：留空
   - **Build output directory**：`/`

3. **配置环境变量**（这是唯一需要填的东西）：
   进入项目 → **Settings** → **Environment variables** → **Production**，新增变量：

   | 变量名 | 值 |
   |---|---|
   | `SITE_CONFIG` | 一份 JSON，字段见下文（可全部留空） |

   最小可用示例：

   ```json
   {"SITE_NAME":"你的网站名","SITE_DESCRIPTION":"一句话介绍"}
   ```

4. 保存后进入 **Deployments** 页面，对最新部署点 **Redeploy**，环境变量才会生效。

5. 访问 `https://<项目名>.pages.dev` 即可。之后想换自定义域名，在 **Custom domains** 里添加即可。

## 怎么改内容

两种方式，推荐第二种：

**方式一：Cloudflare 面板**
Settings → Environment variables → Production → 编辑 `SITE_CONFIG` → 保存 → Redeploy。

**方式二：网站设置面板（推荐）**
打开网站 → 点页脚齿轮「设置」→ 在面板里可视化编辑各个项目 → 点「导出值」复制生成的 JSON → 粘贴回面板的 `SITE_CONFIG` 变量 → 保存并 Redeploy。
之后想再改，在设置面板里点「导入值」把 JSON 粘回去，分解成各个字段继续编辑。

> 注意：改环境变量后必须 **Redeploy** 一次才生效（Pages 的环境变量只在构建/部署时进入运行时）。

## 本地开发

```bash
# 安装 wrangler（项目本身零依赖，这是可选的开发工具）
npm install -g wrangler

# 复制配置示例
cp .dev.vars.example .dev.vars   # Windows: copy .dev.vars.example .dev.vars

# 启动本地预览（wrangler pages dev 自动读取 .dev.vars）
npx wrangler pages dev
```

## SITE_CONFIG 字段说明

| 字段 | 说明 |
|---|---|
| `SITE_NAME` | 网站名（标题 / 欢迎语 / 页脚 / og:title） |
| `SITE_SUBTITLE` | 副标题（渐变色显示在欢迎语网站名后；留空则只显示网站名） |
| `SITE_DESCRIPTION` | 网站介绍（description / og:description） |
| `SITE_FOOTER` | 页脚文字（留空则显示「网站名 © 年份」） |
| `FAVICON_URL` | 网站图标外链（同时用作 og:image；留空则不输出图标标签） |
| `SITE_URL` | 本站完整地址（用于 og:url，如 `https://example.com`） |
| `SITE_LINKS` | 网址区域卡片数组，字段 `title` / `desc` / `url` / `icon`（icon 可留空）；未配置时显示两条示例卡片 |
| `GITHUB_URL` | GitHub 主页链接（留空则图标只展示、点击不跳转） |
| `EMAIL` | 邮箱地址（自动补 `mailto:`） |
| `DONATE_URL` | 捐赠 / 打赏链接 |
| `BILIBILI_URL` | B 站空间链接 |
| `WECHAT_QR_URL` | 微信二维码图片外链（有值才弹窗，无值时点击无反应） |

社交图标（GitHub / 邮箱 / 捐赠 / 微信 / B站）始终显示，对应链接没配时只是展示、点击不跳转。

## 注意事项

- **不要把 `wrangler.toml` 提交进仓库**：Pages 的 Git 构建会把它当作唯一配置源，同步时清空面板里设置的环境变量。本仓库的 `.gitignore` 已默认排除它，本地开发保留即可。
- `SITE_CONFIG` 是 JSON，注意引号和逗号；粘贴到面板时不需要最外层的单引号。
- 直接上传部署（`wrangler pages deploy`）同样支持，变量写在本地 `wrangler.toml` 的 `[vars]` 里即可，但那样就无法在面板里改了。

## 文件结构

```
index.html                 单页站点本体
functions/_middleware.js   环境变量注入中间件
files/settings.js          页脚设置面板（可视化编辑 / 导入导出）
.dev.vars.example          环境变量配置示例（复制为 .dev.vars 用于本地开发）
package.json               仅 dev/deploy 两个 npm script
```

## License

MIT
