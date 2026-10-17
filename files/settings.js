/**
 * 设置面板：可视化编辑网站配置（对应环境变量 SITE_CONFIG）
 *
 * 用法：
 *   打开    点击页脚中网站名左侧的齿轮图标
 *   初始值  localStorage 里的编辑草稿优先，否则用中间件注入的当前线上配置
 *            （window.__SITE_CONFIG__）
 *   导出    汇总表单生成 JSON 值，复制后粘贴到 Cloudflare Pages 控制台
 *           -> ytxz-de -> Settings -> Environment variables -> Production
 *           -> 变量名 SITE_CONFIG -> 保存 -> Redeploy，即完成修改
 *   导入    粘贴一份 JSON 值，点「解析填入」分解到各个字段，方便继续改
 */
(function () {
    'use strict';

    var STORAGE_KEY = 'ytxz-site-config-draft';

    // 文本框字段（SITE_LINKS 用单独的列表编辑器）
    var FIELDS = [
        { key: 'SITE_NAME', label: '网站名' },
        { key: 'SITE_SUBTITLE', label: '副标题（渐变）' },
        { key: 'SITE_DESCRIPTION', label: '网站介绍' },
        { key: 'SITE_FOOTER', label: '页脚文字', ph: '（留空则显示 网站名 © 年份）' },
        { key: 'FAVICON_URL', label: '图标外链' },
        { key: 'SITE_URL', label: '本站地址' },
        { key: 'GITHUB_URL', label: 'GitHub' },
        { key: 'EMAIL', label: '邮箱' },
        { key: 'DONATE_URL', label: '捐赠链接' },
        { key: 'BILIBILI_URL', label: 'B站空间' },
        { key: 'WECHAT_QR_URL', label: '微信二维码' },
    ];

    var el = {};
    var links = [];

    function $(id) { return document.getElementById(id); }

    // ---- 数据 ----

    // 初始配置：编辑草稿优先，否则当前线上配置
    function loadConfig() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                var draft = JSON.parse(raw);
                if (draft && typeof draft === 'object') return draft;
            }
        } catch (e) { /* 草稿损坏则忽略 */ }
        var live = window.__SITE_CONFIG__;
        return (live && typeof live === 'object') ? live : {};
    }

    function saveDraft(cfg) {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg)); } catch (e) { /* 隐私模式等场景下静默失败 */ }
    }

    // ---- 渲染 ----

    function renderFields(cfg) {
        var html = '';
        for (var i = 0; i < FIELDS.length; i++) {
            var f = FIELDS[i];
            var v = (cfg && typeof cfg[f.key] === 'string') ? cfg[f.key] : '';
            // value 属性转义，防止配置里的引号破坏 DOM
            v = String(v).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
            html += '<div class="settingsRow"><label>' + f.label + '</label>' +
                '<input type="text" data-key="' + f.key + '" value="' + v + '" placeholder="' + (f.ph || '（留空则不显示）') + '"></div>';
        }
        el.fields.innerHTML = html;
        var inputs = el.fields.querySelectorAll('input');
        for (var j = 0; j < inputs.length; j++) {
            inputs[j].addEventListener('input', function () { saveDraft(collect()); });
        }
    }

    function renderLinksEditor(cfg) {
        links = [];
        if (cfg && Array.isArray(cfg.SITE_LINKS)) {
            for (var i = 0; i < cfg.SITE_LINKS.length; i++) {
                var it = cfg.SITE_LINKS[i] || {};
                links.push({
                    title: it.title || '',
                    desc: it.desc || '',
                    url: it.url || '',
                    icon: it.icon || '',
                });
            }
        }
        renderLinksRows();
    }

    function renderLinksRows() {
        var html = '';
        for (var i = 0; i < links.length; i++) {
            html += '<div class="settingsLinkRow">' +
                '<input class="lk-title" type="text" placeholder="标题" data-i="' + i + '" data-f="title" value="' + escAttr(links[i].title) + '">' +
                '<input class="lk-desc" type="text" placeholder="描述" data-i="' + i + '" data-f="desc" value="' + escAttr(links[i].desc) + '">' +
                '<input class="lk-url" type="text" placeholder="https://" data-i="' + i + '" data-f="url" value="' + escAttr(links[i].url) + '">' +
                '<input class="lk-icon" type="text" placeholder="图标(可空)" data-i="' + i + '" data-f="icon" value="' + escAttr(links[i].icon) + '">' +
                '<button class="lk-del" type="button" data-i="' + i + '" title="删除">\u00d7</button>' +
                '</div>';
        }
        el.links.innerHTML = html;
        var inputs = el.links.querySelectorAll('input');
        for (var j = 0; j < inputs.length; j++) {
            inputs[j].addEventListener('input', onLinkInput);
        }
        var dels = el.links.querySelectorAll('.lk-del');
        for (var k = 0; k < dels.length; k++) {
            dels[k].addEventListener('click', function (e) {
                links.splice(Number(e.currentTarget.getAttribute('data-i')), 1);
                renderLinksRows();
                saveDraft(collect());
            });
        }
    }

    function onLinkInput(e) {
        var i = Number(e.currentTarget.getAttribute('data-i'));
        var f = e.currentTarget.getAttribute('data-f');
        links[i][f] = e.currentTarget.value;
        saveDraft(collect());
    }

    function escAttr(s) {
        return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
    }

    // ---- 表单收集 ----

    function collect() {
        var cfg = {};
        var inputs = el.fields.querySelectorAll('input');
        for (var i = 0; i < inputs.length; i++) {
            var v = inputs[i].value.replace(/^\s+|\s+$/g, '');
            if (v) cfg[inputs[i].getAttribute('data-key')] = v;
        }
        var list = [];
        for (var j = 0; j < links.length; j++) {
            var l = links[j];
            if (!l.title.replace(/^\s+|\s+$/g, '') && !l.url.replace(/^\s+|\s+$/g, '')) continue;
            list.push({
                title: l.title.replace(/^\s+|\s+$/g, ''),
                desc: l.desc.replace(/^\s+|\s+$/g, ''),
                url: l.url.replace(/^\s+|\s+$/g, ''),
                icon: l.icon.replace(/^\s+|\s+$/g, ''),
            });
        }
        if (list.length) cfg.SITE_LINKS = list;
        return cfg;
    }

    // ---- 导入 / 导出 ----

    function showIO(show, hint) {
        el.io.classList.toggle('show', !!show);
        el.ioHint.textContent = hint || '';
    }

    function doExport() {
        var cfg = collect();
        saveDraft(cfg);
        el.ioText.value = JSON.stringify(cfg, null, 2);
        showIO(true, '已生成配置值。用法：到 Cloudflare Pages 控制台 -> cfprofile -> Settings -> Environment variables -> Production，' +
            '把值填入 SITE_CONFIG 保存，然后到 Deployments 页面对最新部署点一次 Redeploy，即完成修改。');
    }

    function doImport() {
        var raw = el.ioText.value.replace(/^\s+|\s+$/g, '');
        if (!raw) {
            showIO(true, '请先在上方粘贴 JSON 值。');
            return;
        }
        var cfg;
        try {
            cfg = JSON.parse(raw);
        } catch (e) {
            showIO(true, 'JSON 解析失败：' + e.message);
            return;
        }
        if (!cfg || typeof cfg !== 'object' || Array.isArray(cfg)) {
            showIO(true, '格式不对：需要一个 JSON 对象，例如 {"SITE_NAME":"我的网站"}。');
            return;
        }
        renderFields(cfg);
        renderLinksEditor(cfg);
        saveDraft(collect());
        showIO(true, '已解析并填入各个字段，可继续编辑后重新导出。');
    }

    function doCopy() {
        var text = el.ioText.value;
        if (!text) {
            showIO(true, '没有可复制的内容，请先点「导出值」。');
            return;
        }
        function ok() { el.ioHint.textContent = '已复制到剪贴板。'; }
        function fallback() {
            el.ioText.select();
            try {
                document.execCommand('copy');
                ok();
            } catch (e) {
                el.ioHint.textContent = '复制失败，请手动全选复制。';
            }
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(ok, fallback);
        } else {
            fallback();
        }
    }

    // ---- 打开 / 关闭 ----

    function openPanel() {
        var cfg = loadConfig();
        renderFields(cfg);
        renderLinksEditor(cfg);
        showIO(false);
        el.mask.classList.add('show');
    }

    function closePanel() {
        el.mask.classList.remove('show');
        showIO(false);
    }

    // ---- 初始化 ----

    function init() {
        el.mask = $('settingsMask');
        el.fields = $('settingsFields');
        el.links = $('linksEditor');
        el.io = $('settingsIO');
        el.ioText = $('ioTextarea');
        el.ioHint = $('ioHint');
        if (!el.mask || !el.fields || !el.links) return;

        // 页脚齿轮，点击打开设置面板
        var gearBtns = document.querySelectorAll('.settingsBtn');
        for (var g = 0; g < gearBtns.length; g++) {
            gearBtns[g].addEventListener('click', openPanel);
        }
        $('settingsClose').addEventListener('click', closePanel);
        // 点遮罩空白处关闭
        el.mask.addEventListener('click', function (e) {
            if (e.target === el.mask) closePanel();
        });
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') closePanel();
        });

        $('linksAdd').addEventListener('click', function () {
            links.push({ title: '', desc: '', url: '', icon: '' });
            renderLinksRows();
            saveDraft(collect());
        });
        $('btnExport').addEventListener('click', doExport);
        $('btnImport').addEventListener('click', doImport);
        $('btnCopy').addEventListener('click', doCopy);
        $('btnParse').addEventListener('click', doImport);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
