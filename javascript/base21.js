import { getApp, getApps, initializeApp } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import { getFirestore, collection, getDocs, query, where } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';
import { FLOOR_TITLES, renderBlueprint, getBlueprintSvg, positionElementFromPercent, addResizeRepositionListener } from './map-blueprint.js';

const firebaseConfig = {
  apiKey: "AIzaSyA5uU-q3FEcElflECG6dc4AckxxX7iKj-s",
  authDomain: "soeiday-b3b5f.firebaseapp.com",
  projectId: "soeiday-b3b5f",
  storageBucket: "soeiday-b3b5f.firebasestorage.app",
  messagingSenderId: "911210293928",
  appId: "1:911210293928:web:8ce217bfe7d5f4d837f09d",
  measurementId: "G-1H9MSJMVQP"
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);
const BOOTHS_COLLECTION = 'booths';
const LEGACY_MAP_COLLECTION = ['artifacts', 'soei-day-2026', 'public', 'data', 'map_rooms'];

const categoryMeta = {
  food: { label: '模擬店・飲食', bg: 'bg-brand-orange', text: 'text-white', dot: 'bg-brand-orange' },
  exhibition: { label: '展示・体験', bg: 'bg-brand-lime', text: 'text-slate-900', dot: 'bg-brand-lime' },
  stage: { label: 'ステージ・公演', bg: 'bg-blue-500', text: 'text-white', dot: 'bg-blue-500' },
  other: { label: '本部・休憩所・その他', bg: 'bg-slate-500', text: 'text-white', dot: 'bg-slate-500' }
};

const booths = {};
const el = {
  loading: document.getElementById('map-loading'),
  mapTarget: document.getElementById('blueprint-render-target'),
  detail: document.getElementById('room-detail-container'),
  selectedId: document.getElementById('selected-room-id'),
  floorTitle: document.querySelector('#current-floor-title span')
};

let currentFloor = 'h1';
let renderedMap = null;

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function categoryMetaOf(category) {
  return categoryMeta[category] || categoryMeta.other;
}

function summaryText(text, limit = 110) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  return clean.length > limit ? `${clean.slice(0, limit)}…` : clean;
}

function youtubeEmbedUrl(id) {
  return id ? `https://www.youtube.com/embed/${encodeURIComponent(id)}` : '';
}

function openBoothDetail(id, updateHash = true) {
  const booth = booths[id];
  if (!booth) return;
  if (updateHash) history.replaceState(null, '', `#${encodeURIComponent(id)}`);

  document.getElementById('booth-list-view')?.classList.add('hidden');
  const detailView = document.getElementById('booth-detail-view');
  detailView.classList.remove('hidden');

  const meta = categoryMetaOf(booth.category);
  const imageHtml = booth.imageData
    ? (booth.boothUrl
        ? `<a href="${escapeHtml(booth.boothUrl)}" target="_blank" rel="noopener noreferrer" class="block group" aria-label="${escapeHtml(booth.title)}の詳細ページへ"><img src="${escapeHtml(booth.imageData)}" alt="${escapeHtml(booth.title)}" class="w-full max-h-[850px] object-contain bg-slate-100 dark:bg-slate-900 transition-transform duration-500 group-hover:scale-[1.01]"><span class="block text-center text-xs tracking-widest text-brand-orange dark:text-brand-orangeDark py-2 font-sans">画像をタップして専用ページへ <i class="fa-solid fa-arrow-up-right-from-square ml-1"></i></span></a>`
        : `<img src="${escapeHtml(booth.imageData)}" alt="${escapeHtml(booth.title)}" class="w-full max-h-[850px] object-contain bg-slate-100 dark:bg-slate-900">`)
    : '';

  const tagsHtml = Array.isArray(booth.tags) ? booth.tags.map((tag) => `<span class="px-2.5 py-1 bg-gray-100 dark:bg-slate-700 text-xs text-slate-600 dark:text-slate-300 rounded-sm">#${escapeHtml(tag)}</span>`).join('') : '';
  const videoHtml = booth.youtubeId ? `<div class="mt-8"><div class="aspect-video w-full overflow-hidden bg-black shadow-lg"><iframe src="${youtubeEmbedUrl(booth.youtubeId)}" title="${escapeHtml(booth.title)} YouTube動画" class="w-full h-full border-0" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div></div>` : '';

  detailView.innerHTML = `
    <div class="bg-white dark:bg-slate-800 shadow-xl border border-gray-100 dark:border-white/5 rounded-sm overflow-hidden">
      ${imageHtml ? `<div class="border-b border-gray-100 dark:border-white/10">${imageHtml}</div>` : ''}
      <div class="p-6 sm:p-10">
        <div class="flex flex-wrap items-center gap-2 mb-4">
          <span class="px-3 py-1 ${meta.bg} ${meta.text} text-xs tracking-widest rounded-sm">${meta.label}</span>
          <span class="text-sm text-slate-500 dark:text-slate-400 tracking-wider"><i class="fa-solid fa-location-dot mr-1"></i>${escapeHtml(booth.roomName)}</span>
          <span class="text-sm text-slate-500 dark:text-slate-400 tracking-wider"><i class="fa-solid fa-layer-group mr-1"></i>${escapeHtml(FLOOR_TITLES[booth.floor] || booth.floor)}</span>
        </div>
        <h2 class="text-3xl md:text-4xl font-bold tracking-widest leading-tight text-slate-900 dark:text-white border-b border-gray-100 dark:border-white/10 pb-5">${escapeHtml(booth.title)}</h2>
        <div class="mt-7 text-slate-700 dark:text-slate-300 leading-loose tracking-wide whitespace-pre-wrap text-sm sm:text-base">${escapeHtml(booth.description)}</div>
        ${tagsHtml ? `<div class="flex flex-wrap gap-2 mt-7">${tagsHtml}</div>` : ''}
        ${videoHtml}
        <div class="mt-10 pt-6 border-t border-gray-100 dark:border-white/10 flex flex-wrap gap-3">
          <button type="button" id="back-to-booth-list" class="inline-flex items-center gap-2 border border-slate-900 dark:border-white px-6 py-3 tracking-widest text-sm hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-slate-900 transition"><i class="fa-solid fa-arrow-left"></i>一覧へ戻る</button>
          <a href="/map/#${encodeURIComponent(id)}" class="inline-flex items-center gap-2 border border-slate-300 dark:border-slate-600 px-6 py-3 tracking-widest text-sm hover:border-brand-orange transition"><i class="fa-solid fa-map-location-dot"></i>会場マップで見る</a>
        </div>
      </div>
    </div>
  `;
  document.getElementById('back-to-booth-list').addEventListener('click', () => showBoothList());
  detailView.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function showBoothList(clearHash = true) {
  document.getElementById('booth-detail-view')?.classList.add('hidden');
  document.getElementById('booth-list-view')?.classList.remove('hidden');
  if (clearHash) history.replaceState(null, '', location.pathname + location.search);
}

function renderBoothList() {
  const container = document.getElementById('booths-container');
  if (!container) return;
  const floorOrder = ['h1', 'h2', 'h3', 's1', 's2', 's3'];
  const entries = Object.entries(booths);

  container.innerHTML = floorOrder.map((floorKey) => {
    const floorBooths = entries.filter(([, booth]) => booth.floor === floorKey).sort(([, a], [, b]) => String(a.title).localeCompare(String(b.title), 'ja'));
    if (!floorBooths.length) return '';
    const cards = floorBooths.map(([id, booth]) => {
      const meta = categoryMetaOf(booth.category);
      const tags = Array.isArray(booth.tags) ? booth.tags.slice(0, 4).map((tag) => `<span class="px-2 py-0.5 bg-gray-100 dark:bg-slate-700 text-[10px] text-slate-600 dark:text-slate-300 rounded">#${escapeHtml(tag)}</span>`).join('') : '';
      return `
        <button type="button" data-booth-id="${escapeHtml(id)}" class="group text-left bg-white dark:bg-slate-800 border border-gray-100 dark:border-white/5 shadow-lg rounded-sm overflow-hidden hover:-translate-y-0.5 transition-transform duration-300">
          <div class="grid grid-cols-1 sm:grid-cols-[170px_1fr]">
            <div class="h-44 sm:h-full min-h-[150px] bg-slate-100 dark:bg-slate-900 overflow-hidden">
              ${booth.imageData ? `<img src="${escapeHtml(booth.imageData)}" alt="${escapeHtml(booth.title)}" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105">` : '<div class="w-full h-full flex items-center justify-center text-slate-400"><i class="fa-solid fa-store text-3xl"></i></div>'}
            </div>
            <div class="p-5">
              <div class="flex flex-wrap items-center gap-2 mb-2"><span class="px-2.5 py-1 ${meta.bg} ${meta.text} text-[10px] tracking-widest rounded-sm">${meta.label}</span><span class="text-xs text-slate-400">${escapeHtml(booth.roomName)}</span></div>
              <h3 class="text-xl font-bold tracking-widest text-slate-900 dark:text-white leading-relaxed">${escapeHtml(booth.title)}</h3>
              <p class="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300 font-light">${escapeHtml(summaryText(booth.description))}</p>
              ${tags ? `<div class="flex flex-wrap gap-1.5 mt-4">${tags}</div>` : ''}
              <div class="mt-5 text-brand-orange dark:text-brand-orangeDark text-xs tracking-widest font-sans">詳細を見る <i class="fa-solid fa-arrow-right ml-1 group-hover:translate-x-1 transition-transform"></i></div>
            </div>
          </div>
        </button>`;
    }).join('');

    return `
      <section class="floor-section">
        <div class="flex items-end gap-4 mb-6 border-b-2 ${floorKey === 'h1' || floorKey === 'h3' || floorKey === 's2' ? 'border-brand-orange dark:border-brand-orangeDark' : 'border-brand-lime dark:border-brand-limeDark'} pb-3">
          <h3 class="text-2xl font-bold tracking-widest text-slate-900 dark:text-white">${escapeHtml(FLOOR_TITLES[floorKey])}</h3>
          <span class="text-xs text-slate-500 dark:text-slate-400 font-sans tracking-widest">${floorBooths.length} 件</span>
        </div>
        <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">${cards}</div>
      </section>`;
  }).join('');

  if (!container.innerHTML.trim()) {
    container.innerHTML = '<div class="text-center py-20 text-slate-400 font-light">現在公開されている出店情報はありません。</div>';
  }

  container.querySelectorAll('[data-booth-id]').forEach((button) => button.addEventListener('click', () => openBoothDetail(button.dataset.boothId)));
}

function syncHashDetail() {
  const id = decodeURIComponent(location.hash.replace(/^#/, ''));
  if (id && booths[id]) openBoothDetail(id, false);
  else showBoothList(false);
}

function categoryPinHtml(booth) {
  const meta = categoryMetaOf(booth.category);
  return `<button type="button" class="px-3 py-1.5 ${meta.bg} ${meta.text} font-bold text-[11px] shadow-md rounded-full flex items-center gap-1.5 hover:scale-105 transition-transform whitespace-nowrap"><i class="fa-solid fa-location-dot"></i><span>${escapeHtml(booth.title || booth.roomName || 'ブース')}</span></button>`;
}

function renderMapPins() {
  const surface = renderedMap?.querySelector('#map-click-surface') || renderedMap;
  const layer = surface?.querySelector('#pins-layer');
  const svg = getBlueprintSvg(renderedMap);
  if (!surface || !layer) return;
  layer.innerHTML = '';

  Object.entries(booths).forEach(([id, booth]) => {
    if (booth.floor !== currentFloor || !booth.posX || !booth.posY) return;
    const pin = document.createElement('div');
    pin.className = 'room-pin absolute';
    pin.dataset.posX = booth.posX;
    pin.dataset.posY = booth.posY;
    pin.innerHTML = categoryPinHtml(booth);
    pin.querySelector('button').addEventListener('click', (event) => {
      event.stopPropagation();
      if (el.detail) {
        renderMapDetail(booth, id);
      }
    });
    layer.appendChild(pin);
  });

  const reposition = () => layer.querySelectorAll('[data-pos-x][data-pos-y]').forEach((pin) => positionElementFromPercent(pin, layer, svg, pin.dataset.posX, pin.dataset.posY));
  requestAnimationFrame(reposition);
  return reposition;
}

function renderMapDetail(booth, id) {
  const meta = categoryMetaOf(booth.category);
  const tags = Array.isArray(booth.tags) ? booth.tags.map((tag) => `<span class="text-[11px] px-2 py-0.5 bg-gray-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded">#${escapeHtml(tag)}</span>`).join('') : '';
  el.selectedId.textContent = booth.title || id;
  el.detail.innerHTML = `
    <div class="space-y-4 animate-fade-in">
      ${booth.imageData ? `<button type="button" id="map-detail-image" class="block w-full overflow-hidden bg-slate-100 dark:bg-slate-900 rounded-sm"><img src="${escapeHtml(booth.imageData)}" alt="${escapeHtml(booth.title)}" class="w-full max-h-56 object-contain"></button>` : ''}
      <div class="flex flex-wrap items-center gap-2">
        <span class="px-2 py-0.5 text-xs font-medium rounded ${meta.bg} ${meta.text}">${meta.label}</span>
        <span class="text-xs font-mono text-slate-400">${escapeHtml(booth.roomName)}</span>
      </div>
      <h3 class="text-xl font-bold text-slate-900 dark:text-white border-b border-gray-100 dark:border-slate-700 pb-2">${escapeHtml(booth.title)}</h3>
      <p class="text-sm text-slate-600 dark:text-slate-300 font-light leading-relaxed whitespace-pre-wrap">${escapeHtml(booth.description)}</p>
      ${tags ? `<div class="flex flex-wrap gap-1 pt-2">${tags}</div>` : ''}
      <a href="/booth/#${encodeURIComponent(id)}" class="inline-flex items-center gap-2 text-brand-orange dark:text-brand-orangeDark text-sm tracking-widest">出店詳細を見る <i class="fa-solid fa-arrow-right"></i></a>
    </div>`;
  const image = document.getElementById('map-detail-image');
  if (image) image.addEventListener('click', () => openBoothDetail(id));
}

async function switchFloor(floorKey) {
  currentFloor = floorKey;
  document.querySelectorAll('.floor-btn').forEach((button) => {
    const active = button.id === `btn-${floorKey}`;
    button.classList.toggle('bg-slate-900', active);
    button.classList.toggle('text-white', active);
    button.classList.toggle('dark:bg-white', active);
    button.classList.toggle('dark:text-slate-900', active);
    button.classList.toggle('border-transparent', active);
    button.classList.toggle('border-gray-300', !active);
    button.classList.toggle('dark:border-slate-700', !active);
    button.classList.toggle('text-slate-700', !active);
    button.classList.toggle('dark:text-slate-300', !active);
  });
  if (el.floorTitle) el.floorTitle.textContent = `${FLOOR_TITLES[floorKey]} フロアマップ`;
  try {
    renderedMap = await renderBlueprint(el.mapTarget, floorKey);
    renderMapPins();
  } catch (error) {
    console.error(error);
    el.mapTarget.innerHTML = '<div class="map-error flex items-center justify-center text-center text-red-500 dark:text-red-400"><div><i class="fa-solid fa-triangle-exclamation text-3xl mb-3"></i><p class="text-sm leading-relaxed">フロア図を読み込めませんでした。<br>Blueprintファイルの読み込みを確認してください。</p></div></div>';
  }
}

window.switchFloor = switchFloor;

async function loadBooths() {
  const q = query(collection(db, BOOTHS_COLLECTION), where('published', '==', true));
  const snapshot = await getDocs(q);
  Object.keys(booths).forEach((id) => delete booths[id]);
  snapshot.forEach((item) => { booths[item.id] = item.data(); });
  renderBoothList();
  if (el.loading) el.loading.classList.add('hidden');
  await switchFloor(currentFloor);
  syncHashDetail();
}

window.addEventListener('hashchange', syncHashDetail);
addResizeRepositionListener(() => renderMapPins());

loadBooths().catch((error) => {
  console.error(error);
  if (el.loading) el.loading.innerHTML = '<div class="text-red-500 dark:text-red-400">出店情報を読み込めませんでした。Firebaseの設定とRulesを確認してください。</div>';
});
