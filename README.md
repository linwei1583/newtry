# GitHub Pulse

一个展示 GitHub 全球最受关注公开仓库的静态网页。榜单按 GitHub `stargazers_count`（Star 数）降序取前 10 名，页面支持关键词搜索、语言筛选，以及按 Star、Fork 和最近更新时间重新排序。

## 数据更新

GitHub Actions 每小时请求 GitHub REST API 的 Repository Search 接口，生成 `data/repositories.json` 并提交更新。修改程序文件推送到 `master` 时也会触发一次抓取；更新数据文件本身不会重复触发工作流。页面只读取仓库内的 JSON 数据，不会在访问者浏览器中调用 GitHub API。

如需手动刷新，在仓库 **Actions → Update GitHub top repositories → Run workflow** 执行工作流。公开仓库 API 无需个人访问令牌；工作流令牌仅用于向当前仓库写入更新后的榜单。

## 本地运行

```bash
python -m http.server 8000
```

访问 `http://localhost:8000`。本地抓取最新榜单可运行：

```bash
python scripts/fetch_repositories.py
```

本地脚本请求 GitHub 公共 API。若 API 不可达，会保留现有榜单 JSON，不覆盖为错误数据。

## GitHub Pages

在仓库 **Settings → Pages** 中选择 `Deploy from a branch`，再将 `master` 分支的 `/ (root)` 设为发布来源。工作流需要有仓库内容写入权限。

## 排名口径

“关注度”按 GitHub Star 数衡量，返回 GitHub 搜索索引中 Star 数最高的十个公开、非 fork 仓库。它是累计 Star 排名，不是最近增长最快的 Trending 排名。数据更新时间取决于 GitHub Actions 调度情况。
