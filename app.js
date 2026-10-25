const CACHE_KEY = 'market-brief-news-v2';
const PAGE_SIZE = 12;
const CATEGORY_LABELS = { markets: '全球市场', economy: '宏观经济', business: '公司商业', technology: '科技金融' };
let articles = [];
let activeCategory = 'all';
let visibleLimit = PAGE_SIZE;
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

async function loadNews(force = false) {
  if (isLoading) return;
  const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
  setLoading(true);
  updateStatus(force ? '正在读取最新新闻数据…' : '正在读取新闻数据…');
  try {
    const response = await fetch(`data/news.json${force ? `?t=${Date.now()}` : ''}`, { cache: force ? 'no-store' : 'default' });
    if (!response.ok) throw new Error(`新闻数据暂不可用 (${response.status})`);
    const data = await response.json();
    if (!Array.isArray(data.items)) throw new Error('新闻数据格式不正确');
    articles = data.items.map(item => ({ ...item, categoryLabel: CATEGORY_LABELS[item.category] || '财经新闻', publishedAt: Date.parse(item.publishedAt) || Date.now() })).filter(item => item.title && item.link);
    localStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), items: articles }));
    render();
    if (data.updatedAt) {
      const updated = new Date(data.updatedAt);
      document.querySelector('#last-updated').textContent = `数据更新于 ${new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(updated)}`;
      updateStatus('数据来自自动更新的全球 RSS 新闻源');
    } else {
      updateStatus('新闻数据尚未生成，请先运行 GitHub Actions 工作流');
    }
  } catch (error) {
    if (cached?.items?.length) {
      articles = cached.items;
      render();
      updateStatus('暂时无法读取最新数据，显示浏览器缓存');
    } else {
      articles = [];
      render();
      updateStatus('新闻数据尚不可用；请确认已运行 GitHub Actions，或稍后重试');
    }
  } finally { setLoading(false); }
}

function updateStatus(message) { status.innerHTML = `<span class="status-dot"></span>${message}`; }

function timeAgo(timestamp) {
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  return `${Math.floor(hours / 24)} 天前`;
}

function render() {
  const query = document.querySelector('#search-input').value.trim().toLowerCase();
  const sort = document.querySelector('#sort-select').value;
  const filtered = articles.filter(item => (activeCategory === 'all' || item.category === activeCategory) && (!query || `${item.title} ${item.description} ${item.source}`.toLowerCase().includes(query)));
  filtered.sort((a, b) => sort === 'newest' ? b.publishedAt - a.publishedAt : a.publishedAt - b.publishedAt);
  const visible = filtered.slice(0, visibleLimit);
  document.querySelector('#result-count').textContent = filtered.length ? `(${filtered.length})` : '';
  document.querySelector('#all-count').textContent = articles.length || '—';
  emptyState.hidden = filtered.length > 0;
  document.querySelector('#load-more').hidden = filtered.length <= visibleLimit;
  grid.innerHTML = visible.map((item, index) => `<a class="news-card" href="${escapeAttr(item.link)}" target="_blank" rel="noopener noreferrer" style="animation-delay:${Math.min(index * 25, 300)}ms"><div class="card-top"><span class="source-name">${escapeHtml(item.source)}</span><span class="card-category">${escapeHtml(item.categoryLabel)}</span></div><h3>${escapeHtml(item.title)}</h3>${item.description ? `<p>${escapeHtml(item.description)}</p>` : ''}<div class="card-bottom"><span>${timeAgo(item.publishedAt)}</span><span class="read-arrow">↗</span></div></a>`).join('');
}

function escapeHtml(value) { return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]); }
function escapeAttr(value) { return escapeHtml(value).replace(/`/g, '&#96;'); }

function selectCategory(category) {
  activeCategory = category;
  visibleLimit = PAGE_SIZE;
  document.querySelectorAll('[data-category]').forEach(button => button.classList.toggle('active', button.dataset.category === category));
  render();
}

document.querySelectorAll('[data-category]').forEach(button => button.addEventListener('click', () => selectCategory(button.dataset.category)));
document.querySelector('#refresh-btn').addEventListener('click', () => loadNews(true));
document.querySelector('#search-input').addEventListener('input', () => { visibleLimit = PAGE_SIZE; render(); });
document.querySelector('#sort-select').addEventListener('change', render);
document.querySelector('#load-more').addEventListener('click', () => { visibleLimit += PAGE_SIZE; render(); });
document.querySelector('#clear-search').addEventListener('click', () => { document.querySelector('#search-input').value = ''; selectCategory('all'); });
document.addEventListener('keydown', event => { if (event.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) { event.preventDefault(); document.querySelector('#search-input').focus(); } });

setDate();
loadNews();
