# Market Brief

一个无需构建步骤的静态全球财经新闻看板。页面按全球市场、宏观经济、公司商业和科技金融聚合 Google News RSS 搜索结果，支持分类筛选、关键词搜索、排序与本地缓存。

## 本地运行

直接用浏览器打开 `index.html`，或启动任意静态文件服务器，例如：

```bash
python -m http.server 8000
```

然后访问 `http://localhost:8000`。获取 RSS 时由浏览器请求 rss2json 公共转换服务；这项第三方服务有自己的可用性与调用限制。若在网络策略限制严格的环境下无法加载，页面会提示，并展示浏览器缓存的新闻（若有）。

## GitHub Pages 部署

此项目为纯静态页面，可在仓库 **Settings → Pages** 中选择 `Deploy from a branch`，并选择默认分支的 `/ (root)` 作为发布来源。

新闻标题、摘要和链接由 Google News RSS 返回；内容归原发布媒体所有。页面展示的市场快照为栏目提示，不代表实时行情数据。
