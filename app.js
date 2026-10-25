const CACHE_KEY = 'github-pulse-repositories-v1';
const PAGE_SIZE = 10;
const LANGUAGE_COLORS = { Python: '#3572A5', TypeScript: '#3178c6', JavaScript: '#f1e05a', Go: '#00ADD8', Rust: '#dea584', Java: '#b07219', 'C++': '#f34b7d', Ruby: '#701516', Swift: '#F05138' };
let repositories = [];
let activeLanguage = 'all';
let isLoading = false;

const grid = document.querySelector('#news-grid');
const status = document.querySelector('#feed-status');
const emptyState = document.querySelector('#empty-state');

function setDate() {
  document.querySelector('#today-date').textContent = new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'short', day: 'numeric', weekday: 'short' }).format(new Date());
}

function setLoading(loading) {
  isLoading = loading;
  const button = document.querySelector('#refresh-btn');
  button.disabled = loading;
  button.classList.toggle('loading', loading);
}

async function loadRepositories(force = false) {
  if (isLoading) return;
  const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
  setLoading(true);
  updateStatus(force ? '正在读取最新榜单…' : '正在读取 GitHub 榜单…');
  try {
    const response = await fetch(`data/repositories.json${force ? `?t=${Date.now()}` : ''}`, { cache: force ? 'no-store' : 'default' });
    if (!response.ok) throw new Error(`榜单暂不可用 (${response.status})`);
    const data = await response.json();
    if (!Array.isArray(data.repositories)) throw new Error('榜单数据格式不正确');
    repositories = data.repositories;
    localStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), repositories }));
    render();
    if (data.updatedAt) {
      const updated = new Date(data.updatedAt);
      document.querySelector('#last-updated').textContent = `更新于 ${new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(updated)}`;
      updateStatus('数据来自 GitHub 公共 API · 按 Star 数降序');
    } else {
      updateStatus('榜单数据尚未生成，请稍后刷新');
    }
  } catch (error) {
    if (cached?.repositories?.length) {
      repositories = cached.repositories;
      render();
      updateStatus('暂时无法读取最新榜单，显示浏览器缓存');
    } else {
      repositories = [];
      render();
      updateStatus('榜单数据暂不可用；工作流运行后会自动生成');
    }
  } finally { setLoading(false); }
}

function updateStatus(message) { status.innerHTML = `<span class="status-dot"></span>${message}`; }

function formatCount(value) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')}m`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1).replace(/\.0$/, '')}k`;
  return String(value ?? 0);
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

function render() {
  const query = document.querySelector('#search-input').value.trim().toLowerCase();
  const sort = document.querySelector('#sort-select').value;
  const filtered = repositories.filter(repo => (activeLanguage === 'all' || repo.language === activeLanguage) && (!query || `${repo.fullName} ${repo.description || ''} ${(repo.topics || []).join(' ')}`.toLowerCase().includes(query)));
  filtered.sort((a, b) => sort === 'forks' ? b.forks - a.forks : sort === 'recent' ? new Date(b.pushedAt) - new Date(a.pushedAt) : a.rank - b.rank);
  document.querySelector('#result-count').textContent = `(${filtered.length})`;
  document.querySelector('#all-count').textContent = repositories.length;
  document.querySelector('#repo-total').textContent = repositories.length;
  document.querySelector('#top-stars').textContent = repositories.length ? formatCount(repositories[0].stars) : '—';
  const languageCounts = repositories.reduce((counts, repo) => { if (repo.language) counts[repo.language] = (counts[repo.language] || 0) + 1; return counts; }, {});
  document.querySelector('#top-language').textContent = Object.entries(languageCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';
  emptyState.hidden = filtered.length > 0;
  grid.innerHTML = filtered.map((repo, index) => `<a class="news-card repo-card ${index === 0 ? 'top-repo' : ''}" href="${escapeHtml(repo.url)}" target="_blank" rel="noopener noreferrer" style="animation-delay:${index * 35}ms"><div class="card-top"><span class="rank-badge">${String(repo.rank).padStart(2, '0')}</span><span class="repo-owner">${escapeHtml(repo.owner)}</span><span class="card-category">${escapeHtml(repo.license || '开源项目')}</span></div><h3>${escapeHtml(repo.name)}</h3><p class="repo-full-name">${escapeHtml(repo.fullName)}</p><p class="repo-description">${escapeHtml(repo.description || '暂无项目简介。')}</p>${repo.topics?.length ? `<div class="repo-topics">${repo.topics.slice(0, 3).map(topic => `<span>${escapeHtml(topic)}</span>`).join('')}</div>` : ''}<div class="repo-stats"><span class="repo-language">${repo.language ? `<i style="--language-color:${LANGUAGE_COLORS[repo.language] || '#93a58b'}"></i>${escapeHtml(repo.language)}` : '未指定语言'}</span><span>★ ${formatCount(repo.stars)}</span><span>⑂ ${formatCount(repo.forks)}</span><span class="repo-arrow">↗</span></div></a>`).join('');
}

function selectLanguage(language) {
  activeLanguage = language;
  document.querySelectorAll('[data-language]').forEach(button => button.classList.toggle('active', button.dataset.language === language));
  render();
}

document.querySelectorAll('[data-language]').forEach(button => button.addEventListener('click', () => selectLanguage(button.dataset.language)));
document.querySelector('#refresh-btn').addEventListener('click', () => loadRepositories(true));
document.querySelector('#search-input').addEventListener('input', render);
document.querySelector('#sort-select').addEventListener('change', render);
document.querySelector('#clear-search').addEventListener('click', () => { document.querySelector('#search-input').value = ''; selectLanguage('all'); });
document.addEventListener('keydown', event => { if (event.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) { event.preventDefault(); document.querySelector('#search-input').focus(); } });

setDate();
loadRepositories();
