import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
    import {
      getFirestore,
      collection,
      getDocs,
      query,
      orderBy,
      limit
    } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';
    import { firebaseConfig } from '../firebase-config.js';
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    const status = document.getElementById('status');
    const searchInput = document.getElementById('search-input');
    const categoryFilter = document.getElementById('category-filter');
    const releaseSection = document.getElementById('release-section');
    const topicSection = document.getElementById('topic-section');
    const releaseList = document.getElementById('release-list');
    const topicList = document.getElementById('topic-list');
    const emptyState = document.getElementById('empty-state');
    let allNews = [];
    function escapeForAttribute(value) {
      return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('"', '&quot;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;');
    }
    function formatDate(timestamp) {
      if (!timestamp || typeof timestamp.toDate !== 'function') return '掲載日未設定';
      return new Intl.DateTimeFormat('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(timestamp.toDate());
    }
    function normalize(value) {
      return String(value ?? '').toLocaleLowerCase('ja-JP');
    }
    function renderCards(items) {
      return items.map((item) => {
        const title = escapeForAttribute(item.title || '無題のお知らせ');
        const category = escapeForAttribute(item.category || 'その他');
        const body = String(item.body || '');
        const preview = body.length > 300 ? `${body.slice(0, 300)}…` : body;
        const date = formatDate(item.createdAt);
        return `
          <article class="news-card bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-6 md:p-8 shadow-sm">
            <div class="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-5 pl-2">
              <div class="flex flex-wrap items-center gap-3">
                <span class="inline-flex items-center px-3 py-1 bg-brand-lime/10 dark:bg-brand-limeDark/10 text-brand-lime dark:text-brand-limeDark text-xs font-bold tracking-widest border border-brand-lime/30 dark:border-brand-limeDark/30">${category}</span>
                <time class="text-xs text-slate-400 dark:text-slate-500 tracking-wider">${date}</time>
              </div>
            </div>
            <h4 class="text-xl md:text-2xl font-bold tracking-widest text-slate-900 dark:text-white mb-5 pl-2">${title}</h4>
            <p class="news-body line-clamp-4 text-sm md:text-base text-slate-600 dark:text-slate-300 leading-loose tracking-wide pl-2">${escapeForAttribute(preview)}</p>
            ${body.length > 300 ? `
              <details class="mt-6 pl-2">
                <summary class="cursor-pointer inline-flex items-center gap-2 text-sm text-brand-orange dark:text-brand-orangeDark tracking-wider hover:opacity-70">
                  続きを読む <i class="fa-solid fa-angle-down"></i>
                </summary>
                <p class="news-body mt-4 text-sm md:text-base text-slate-600 dark:text-slate-300 leading-loose tracking-wide">${escapeForAttribute(body)}</p>
              </details>
            ` : ''}
          </article>
        `;
      }).join('');
    }
    function renderNews() {
      const keyword = normalize(searchInput.value.trim());
      const category = categoryFilter.value;
      const filtered = allNews.filter((item) => {
        const matchesKeyword = !keyword || normalize(`${item.title}\n${item.body}`).includes(keyword);
        const matchesCategory = category === 'all' || item.category === category;
        return matchesKeyword && matchesCategory;
      });
      const releases = filtered.filter((item) => !item.type || item.type === 'release');
      const topics = filtered.filter((item) => item.type === 'topic');
      releaseSection.classList.toggle('hidden', releases.length === 0);
      topicSection.classList.toggle('hidden', topics.length === 0);
      emptyState.classList.toggle('hidden', filtered.length !== 0);
      releaseList.innerHTML = renderCards(releases);
      topicList.innerHTML = renderCards(topics);
    }
    async function loadNews() {
      try {
        const q = query(
          collection(db, 'news'),
          orderBy('createdAt', 'desc'),
          limit(50)
        );
        const snapshot = await getDocs(q);
        allNews = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        status.classList.add('hidden');
        renderNews();
      } catch (error) {
        console.error(error);
        status.innerHTML = `
          <div class="max-w-2xl mx-auto border border-red-200 dark:border-red-900/50 bg-red-50/80 dark:bg-red-950/20 p-6 text-left">
            <p class="font-bold text-red-700 dark:text-red-300 tracking-wide mb-2">お知らせを読み込めませんでした。</p>
            <p class="text-sm text-red-600/90 dark:text-red-300/80 leading-relaxed">Firebase の設定、Firestore の作成、Security Rules、インデックス設定を確認してください。</p>
          </div>
        `;
      }
    }
    searchInput.addEventListener('input', renderNews);
    categoryFilter.addEventListener('change', renderNews);
    loadNews();
