/**
 * ytxz-de - Cloudflare Pages 环境变量注入中间件
 *
 * 所有个性化内容都通过「一个」环境变量 SITE_CONFIG 配置（JSON 对象）：
 *
 *   SITE_CONFIG='{
 *     "SITE_NAME": "我的网站",
 *     "SITE_SUBTITLE": "CHILDPIG",
 *     "SITE_DESCRIPTION": "一个简洁的个人主页",
 *     "SITE_FOOTER": "我的网站 © 2026",
 *     "FAVICON_URL": "https://example.com/favicon.png",
 *     "SITE_URL": "https://example.com",
 *     "SITE_LINKS": [{"title":"博客","desc":"描述","url":"https://blog.example.com","icon":""}],
 *     "GITHUB_URL": "https://github.com/xxx",
 *     "EMAIL": "xxx@example.com",
 *     "DONATE_URL": "https://example.com/donate",
 *     "BILIBILI_URL": "https://space.bilibili.com/xxx",
 *     "WECHAT_QR_URL": "https://example.com/wechat.png"
 *   }'
 *
 * 页面页脚的齿轮「设置」可以可视化编辑这些项目，
 * 一键导出 JSON 值，粘贴到 Pages 控制台即可，不需要手写 JSON。
 *
 * 也兼容旧的填法：SITE_CONFIG 未配置时，逐个读取同名旧变量。
 *
 * 支持四类占位符：
 *   1. 普通变量      {{SITE_NAME}} {{SITE_SUBTITLE}} {{SITE_DESCRIPTION}} {{FAVICON_URL}}
 *                   {{SITE_URL}} {{SITE_FOOTER}} {{YEAR}}
 *                   （SITE_FOOTER 留空时回退为「网站名 © 年份」）
 *   2. 条件块        {{#VAR}}...{{/VAR}}   变量未配置（空）时整段不输出
 *   3. 链接渲染      {{LINKS_HTML}}        由 SITE_LINKS(JSON) 渲染网址区域卡片
 *   4. 社交链接占位  {{GITHUB_HREF}} {{MAIL_HREF}} {{BILIBILI_HREF}} {{DONATE_HREF}}
 *                   {{WECHAT_ONCLICK}}   变量有值输出真实链接，无值输出空操作
 *                   （图标始终显示，未配置时只是展示、点击不跳转）
 *   5. 配置注入      {{CONFIG_JSON}}      当前生效配置序列化成 JSON，
 *                   供页面设置面板（files/settings.js）初始化表单
 *
 * 注意：修改变量值后需要触发一次重新部署（Redeploy）才会生效。
 * 本地开发用 .dev.vars 提供同样的 SITE_CONFIG。
 */

// 各配置项的中立默认值（SITE_CONFIG 里没写的项走这里）
const DEFAULTS = {
  SITE_NAME: '我的网站',
  SITE_SUBTITLE: '',
  SITE_DESCRIPTION: '一个简洁的个人主页',
  SITE_FOOTER: '',
  FAVICON_URL: '',
  SITE_URL: '',
  SITE_LINKS: '',
  GITHUB_URL: '',
  EMAIL: '',
  BILIBILI_URL: '',
  DONATE_URL: '',
  WECHAT_QR_URL: '',
};

// SITE_CONFIG 里允许出现的配置键
const CONFIG_KEYS = Object.keys(DEFAULTS);

// SITE_LINKS 未配置时的示例数据，演示网址区域的用法
const DEFAULT_LINKS = [
  { title: '示例链接一', desc: '在环境变量 SITE_LINKS 中配置你的网址', url: 'https://example.com/', icon: '' },
  { title: '示例链接二', desc: 'JSON 字段：title / desc / url / icon', url: 'https://example.com/', icon: '' },
];

// 注入 HTML 属性/正文前做转义，防止变量里的 & < > " ' 破坏结构
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[ch]));
}

// 把 SITE_LINKS 的 JSON 数组渲染成网址区域卡片；解析失败返回空串
function renderLinks(raw) {
  let items;
  try {
    items = JSON.parse(raw);
  } catch (err) {
    return '';
  }
  if (!Array.isArray(items)) {
    return '';
  }
  return items
    .filter((item) => item && typeof item === 'object')
    .map((item) => {
      const url = escapeHtml(item.url || '#');
      const title = escapeHtml(item.title || '');
      const desc = escapeHtml(item.desc || '');
      const icon = item.icon
        ? `<div class="projectItemRight"><img src="${escapeHtml(item.icon)}" alt=""></div>`
        : '';
      return `<a class="projectItem fade-in-visible" target="_blank" href="${url}">
                <div class="projectItemLeft">
                    <h1>${title}</h1>
                    <p>${desc}</p>
                </div>${icon}
            </a>`;
    })
    .join('\n');
}

/**
 * 汇总环境变量：优先读 SITE_CONFIG（JSON 对象），
 * 未配置或解析失败时回退到旧的单独变量（兼容旧部署）。
 * 空串视为未配置，走默认/隐藏。
 */
function resolveEnv(context) {
  const env = { ...DEFAULTS };
  const apply = (key, value) => {
    if (value === undefined || value === null) return;
    if (typeof value !== 'string') value = String(value);
    if (value.trim() !== '') env[key] = value;
  };

  const rawConfig = context.env.SITE_CONFIG;
  if (rawConfig !== undefined && rawConfig !== null && String(rawConfig).trim() !== '') {
    let cfg = null;
    try {
      cfg = JSON.parse(String(rawConfig));
    } catch (err) {
      cfg = null;
    }
    if (cfg && typeof cfg === 'object' && !Array.isArray(cfg)) {
      for (const key of CONFIG_KEYS) {
        let value = cfg[key];
        if (value === undefined || value === null) continue;
        if (key === 'SITE_LINKS' && Array.isArray(value)) {
          value = JSON.stringify(value);
        }
        apply(key, value);
      }
      return env;
    }
    // SITE_CONFIG 解析失败：忽略它，回退旧变量
  }

  // 兼容：旧的单独变量
  for (const key of CONFIG_KEYS) {
    apply(key, context.env[key]);
  }
  return env;
}

/**
 * 把当前生效的配置序列化成 JSON，注入页面供设置面板初始化。
 * SITE_LINKS 转回数组形式；空值项省略；< 转义防止 </script> 断裂。
 */
function buildConfigJson(env) {
  const cfg = {};
  for (const key of CONFIG_KEYS) {
    const value = env[key];
    if (value === undefined || value === '') continue;
    if (key === 'SITE_LINKS') {
      try {
        const arr = JSON.parse(value);
        if (Array.isArray(arr) && arr.length > 0) cfg[key] = arr;
      } catch (err) {
        // 解析失败的 links 不注入
      }
      continue;
    }
    cfg[key] = value;
  }
  return JSON.stringify(cfg).replace(/</g, '\\u003c');
}

export async function onRequest(context) {
  const response = await context.next();

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) {
    return response;
  }

  let html = await response.text();

  const env = resolveEnv(context);
  env.YEAR = String(new Date().getFullYear());

  // 1) 条件块：{{#VAR}}...{{/VAR}}，变量为空时整段移除
  html = html.replace(/\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (match, name, inner) => (env[name] ? inner : ''));

  // 2) 社交链接占位符：有值输出真实链接，无值输出空操作（图标仍显示，点击不跳转）
  const noop = 'javascript:void(0)';
  const mailto = (value) => (value.startsWith('mailto:') ? value : 'mailto:' + value);
  html = html.replace('{{GITHUB_HREF}}', () => escapeHtml(env.GITHUB_URL || noop));
  html = html.replace('{{MAIL_HREF}}', () => escapeHtml(env.EMAIL ? mailto(env.EMAIL) : noop));
  html = html.replace('{{BILIBILI_HREF}}', () => escapeHtml(env.BILIBILI_URL || noop));
  html = html.replace('{{DONATE_HREF}}', () => escapeHtml(env.DONATE_URL || noop));
  html = html.replace('{{WECHAT_ONCLICK}}', () => (env.WECHAT_QR_URL ? 'wx()' : ''));

  // 3) 网址区域：由 SITE_LINKS(JSON) 渲染，未配置时用示例数据
  html = html.replace('{{LINKS_HTML}}', () => renderLinks(env.SITE_LINKS || JSON.stringify(DEFAULT_LINKS)));

  // 4) 当前生效配置注入页面（设置面板初始化用），必须在普通占位符替换之前
  html = html.replace('{{CONFIG_JSON}}', () => buildConfigJson(env));

  // 4.5) 页脚：未配置 SITE_FOOTER 时回退「网站名 © 年份」
  //      （回退值不进 CONFIG_JSON，设置面板里该字段仍显示为空）
  if (!env.SITE_FOOTER) {
    env.SITE_FOOTER = `${env.SITE_NAME} © ${env.YEAR}`;
  }

  // 5) 普通占位符替换（HTML 转义防止注入）
  html = html.replace(/\{\{(\w+)\}\}/g, (match, name) => escapeHtml(env[name] ?? ''));

  // 正文长度已变，必须删掉旧的长度/编码头，否则响应会被截断或乱码
  const headers = new Headers(response.headers);
  headers.delete('content-length');
  headers.delete('content-encoding');

  return new Response(html, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
