const FEEDS = [
  { key: 'markets', label: '全球市场', query: 'stock market OR bond market OR oil OR gold OR currency when:2d' },
  { key: 'economy', label: '宏观经济', query: 'global economy OR inflation OR central bank OR interest rates when:2d' },
  { key: 'business', label: '公司商业', query: 'global business OR companies OR earnings OR trade when:2d' },
  { key: 'technology', label: '科技金融', query: 'technology business OR artificial intelligence companies OR semiconductor when:2d' },
];
const CACHE_KEY = 'market-brief-news-v1';
const CACHE_TTL = 10 * 60 * 1000;
const PAGE_SIZE = 12;
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

function cleanText(value = '') {
  const doc = new DOMParser().parseFromString(value, 'text/html');
  return (doc.body.textContent || '').replace(/\s+/g, ' ').trim();
}

function getSource(item) {
  if (item.author && item.author.length < 48) return item.author;
  try { return new URL(item.link).hostname.replace(/^www\./, ''); } catch { return '全球新闻'; }
}

function normalize(item, category) {
  const title = cleanText(item.title);
  const description = cleanText(item.description || item.content || '');
  return { title, description: description.slice(0, 260), link: item.link, source: getSource(item), category, categoryLabel: FEEDS.find(feed => feed.key === category)?.label || '财经新闻', publishedAt: item.pubDate ? new Date(item.pubDate).getTime() : Date.now() };
}

async function fetchFeed(feed) {
  const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(feed.query)}&hl=en-US&gl=US&ceid=US:en`;
  const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`;
  const response = await fetch(apiUrl, { signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error(`${feed.label}: HTTP ${response.status}`);
  const data = await response.json();
  if (data.status !== 'ok') throw new Error(`${feed.label}: feed unavailable`);
  return data.items.map(item => normalize(item, feed.key)).filter(item => item.title && item.link);
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
  if (!force && cached?.items?.length && Date.now() - cached.savedAt < CACHE_TTL) {
    articles = cached.items;
    render();
    updateStatus('来自最近缓存');
    return;
  }
  setLoading(true);
  updateStatus('正在连接全球新闻源…');
  try {
    const batches = await Promise.allSettled(FEEDS.map(fetchFeed));
    const fetched = batches.flatMap(result => result.status === 'fulfilled' ? result.value : []);
    if (!fetched.length) throw new Error('新闻源暂时不可用');
    const unique = new Map();
    fetched.sort((a, b) => b.publishedAt - a.publishedAt).forEach(item => { if (!unique.has(item.link)) unique.set(item.link, item); });
    articles = [...unique.values()];
    localStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), items: articles }));
    render();
    updateStatus(`${batches.filter(result => result.status === 'fulfilled').length}/${FEEDS.length} 个新闻频道已更新`);
    document.querySelector('#last-updated').textContent = `更新于 ${new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit' }).format(new Date())}`;
  } catch (error) {
    if (cached?.items?.length) {
      articles = cached.items;
      render();
      updateStatus('当前无法连接新闻源，显示已缓存内容');
    } else {
      updateStatus('新闻源暂时不可用，请稍后重试');
      render();
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
