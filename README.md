# Market Brief

一个无需构建步骤的静态全球财经新闻看板。页面按全球市场、宏观经济、公司商业和科技金融聚合 Google News RSS 搜索结果，支持分类筛选、关键词搜索、排序与本地缓存。

新闻由 GitHub Actions 在服务器端定时抓取 RSS，写入 `data/news.json`；浏览器只读取本站 JSON，不再请求 RSS 转换服务或外部新闻接口。

## 本地运行

启动任意静态文件服务器，例如：

```bash
python -m http.server 8000
```

然后访问 `http://localhost:8000`。要在本地生成新闻数据，运行：

```bash
python scripts/fetch_news.py
```

该脚本需要能够访问 Google News RSS。浏览器直接打开 `index.html` 时，浏览器通常会限制读取本地 JSON 文件，因此请使用静态服务器。

## GitHub Pages 部署

此项目为纯静态页面，可在仓库 **Settings → Pages** 中选择 `Deploy from a branch`，并选择默认分支的 `/ (root)` 作为发布来源。仓库 Actions 需允许工作流写入内容；首次运行可在 **Actions → Update finance news → Run workflow** 手动触发。之后工作流每小时运行一次并提交更新后的 JSON 文件。

新闻标题、摘要和链接由 Google News RSS 返回；内容归原发布媒体所有。页面展示的市场快照为栏目提示，不代表实时行情数据。RSS 更新依赖 GitHub Actions 的调度和 Google News RSS 可用性。
