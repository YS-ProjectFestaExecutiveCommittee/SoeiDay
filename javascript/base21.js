import { getApp, getApps, initializeApp } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import { collection, getFirestore, onSnapshot } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';

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
const MAP_COLLECTION = ['artifacts', 'soei-day-2026', 'public', 'data', 'map_rooms'];

const floorTitles = {
  h1: '本館 1F フロアマップ',
  h2: '本館 2F フロアマップ',
  h3: '本館 3F / 新館 B1F フロアマップ',
  s1: '本館 4F / 新館 1F / 体育館 フロアマップ',
  s2: '新館 2F フロアマップ',
  s3: '新館 3F フロアマップ'
};

const roomsState = {};
let currentFloor = 'h1';
let selectedRoomId = null;

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function categoryMeta(category) {
  if (category === 'exhibition') return { label: '展示・体験', cls: 'bg-green-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300' };
  if (category === 'stage') return { label: 'ステージ・公演', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300' };
  if (category === 'other') return { label: '本部・休憩所・その他', cls: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200' };
  return { label: '模擬店・飲食', cls: 'bg-orange-100 text-brand-orange dark:bg-orange-950/40 dark:text-brand-orangeDark' };
}

function mapObjectForFloor(floorKey) {
  const possibleKeys = [
    `blueprint_${floorKey}`,
    floorKey,
    `blueprint${floorKey.toUpperCase()}`,
    `${floorKey}Blueprint`,
    `blueprint_${floorKey.toLowerCase()}`
  ];

  for (const key of possibleKeys) {
    if (window[key]) return window[key];
  }
  return null;
}

async function fetchRemoteBlueprint(floorKey) {
  const url = `https://ys-projectfestaexecutivecommittee.github.io/SoeiDay/blueprint/${floorKey}.js`;
  const response = await fetch(url, { cache: 'force-cache' });
  if (!response.ok) throw new Error(`Blueprint fetch failed: ${response.status}`);
  const text = await response.text();
  const fn = new Function(`
    var mapData;
    ${text.replace(/(const|let)\s+mapData\s*=/g, 'mapData =')}
    return mapData;
  `);
  return fn();
}

function renderBlueprintPaths(mapDataObj, floorKey, blueprintBox) {
  const patterns = {
    h1: ['h1', '本館1', '本館 1'],
    h2: ['h2', '本館2', '本館 2'],
    h3: ['h3', '本館3', '本館 3', '新館b1', '新館 b1'],
    s1: ['s1', '新館1', '新館 1', '本館4', '本館 4', '体育館'],
    s2: ['s2', '新館2', '新館 2'],
    s3: ['s3', '新館3', '新館 3']
  };
  const matchedPatterns = patterns[floorKey] || [floorKey];
  let currentMapPaths = null;

  for (const key of Object.keys(mapDataObj || {})) {
    const lower = key.toLowerCase();
    if (matchedPatterns.some((pattern) => lower.includes(pattern.toLowerCase()))) {
      currentMapPaths = mapDataObj[key];
      break;
    }
  }
  if (!currentMapPaths && mapDataObj && Object.keys(mapDataObj).length) {
    currentMapPaths = mapDataObj[Object.keys(mapDataObj)[0]];
  }

  if (!Array.isArray(currentMapPaths)) {
    showFallbackGrid(blueprintBox, floorKey);
    return;
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  const pathsHtml = currentMapPaths.map((item) => {
    const attrs = Object.entries(item.attributes || {})
      .map(([key, value]) => `${escapeHtml(key)}="${escapeHtml(value)}"`)
      .join(' ');

    if (item.attributes?.d) {
      const parts = String(item.attributes.d).trim().split(/\s+/);
      for (let i = 0; i < parts.length; i += 1) {
        const cmd = parts[i].toUpperCase();
        if (cmd === 'M' || cmd === 'L') {
          const x = Number.parseFloat(parts[i + 1]);
          const y = Number.parseFloat(parts[i + 2]);
          if (Number.isFinite(x) && Number.isFinite(y)) {
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
          }
        }
      }
    }

    const tagName = item.type || 'path';
    return `<${tagName} id="${escapeHtml(item.id || '')}" ${attrs}></${tagName}>`;
  }).join('');

  let viewBox = '0 0 5000 2000';
  if (Number.isFinite(minX) && Number.isFinite(maxX) && Number.isFinite(minY) && Number.isFinite(maxY)) {
    const padX = (maxX - minX) * 0.05 || 50;
    const padY = (maxY - minY) * 0.05 || 50;
    viewBox = `${Math.max(0, minX - padX)} ${Math.max(0, minY - padY)} ${(maxX - minX) + padX * 2} ${(maxY - minY) + padY * 2}`;
  }

  blueprintBox.innerHTML = `
    <div class="relative w-full h-full flex items-center justify-center p-2">
      <svg viewBox="${viewBox}" class="w-full h-full max-h-[600px] drop-shadow-sm" preserveAspectRatio="xMidYMid meet">
        ${pathsHtml}
      </svg>
      <div id="pins-layer" class="absolute inset-0 pointer-events-auto"></div>
    </div>
  `;
  renderPins(floorKey, blueprintBox);
}

function showFallbackGrid(blueprintBox, floorKey) {
  blueprintBox.innerHTML = `
    <div class="relative w-full h-[400px] bg-slate-100 dark:bg-slate-950 flex items-center justify-center rounded overflow-hidden">
      <svg class="absolute inset-0 w-full h-full stroke-slate-300 dark:stroke-slate-800" xmlns="http://www.w3.org/2000/svg">
        <defs><pattern id="grid-${floorKey}" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M 40 0 L 0 0 0 40" fill="none" stroke-width="0.5"/></pattern></defs>
        <rect width="100%" height="100%" fill="url(#grid-${floorKey})"></rect>
      </svg>
      <div id="pins-layer" class="absolute inset-0 pointer-events-auto"></div>
      <div class="relative z-10 text-xs text-slate-400">フロア図を読み込めませんでした</div>
    </div>
  `;
  renderPins(floorKey, blueprintBox);
}

function renderPins(floorKey, blueprintBox) {
  const pinsLayer = blueprintBox.querySelector('#pins-layer');
  if (!pinsLayer) return;
  pinsLayer.innerHTML = '';

  const presetCoordinates = {
    'h1-101': { top: '35%', left: '25%' },
    'h1-102': { top: '35%', left: '50%' },
    'h1-103': { top: '35%', left: '75%' },
    'h2-201': { top: '50%', left: '30%' },
    'h2-202': { top: '50%', left: '60%' }
  };

  Object.entries(roomsState).forEach(([roomId, room]) => {
    if (room.floor !== floorKey) return;
    const topPos = room.posY || presetCoordinates[roomId]?.top || '50%';
    const leftPos = room.posX || presetCoordinates[roomId]?.left || '50%';
    const meta = categoryMeta(room.category);

    const pin = document.createElement('div');
    pin.className = 'room-pin flex items-center justify-center shadow-lg rounded-full cursor-pointer transition-transform duration-200';
    pin.style.top = topPos;
    pin.style.left = leftPos;
    pin.innerHTML = `
      <button type="button" class="px-3 py-1.5 ${meta.label === '展示・体験' ? 'bg-brand-lime text-slate-900' : meta.label === 'ステージ・公演' ? 'bg-blue-500 text-white' : meta.label === '本部・休憩所・その他' ? 'bg-slate-500 text-white' : 'bg-brand-orange text-white'} font-bold text-xs shadow-md rounded-full flex items-center gap-1.5 hover:scale-105 transition-transform">
        <i class="fa-solid fa-location-dot"></i>
        <span>${escapeHtml(room.roomName || roomId)}</span>
      </button>
    `;
    pin.querySelector('button').addEventListener('click', () => window.selectRoom(roomId));
    pinsLayer.appendChild(pin);
  });
}

async function renderMap(floorKey) {
  const container = document.getElementById('blueprint-render-target');
  if (!container) return;
  container.innerHTML = '';

  const blueprintBox = document.createElement('div');
  blueprintBox.className = 'w-full h-full relative flex items-center justify-center min-h-[420px] bg-white dark:bg-slate-900 border border-dashed border-gray-300 dark:border-slate-700 p-4 rounded-sm';
  container.appendChild(blueprintBox);

  try {
    const blueprintObj = mapObjectForFloor(floorKey);
    let rendered = false;

    if (blueprintObj) {
      if (typeof blueprintObj.render === 'function') {
        blueprintObj.render(blueprintBox); rendered = true;
      } else if (typeof blueprintObj.draw === 'function') {
        blueprintObj.draw(blueprintBox); rendered = true;
      } else if (typeof blueprintObj.init === 'function') {
        blueprintObj.init(blueprintBox); rendered = true;
      } else if (typeof blueprintObj === 'function') {
        blueprintObj(blueprintBox); rendered = true;
      } else if (typeof blueprintObj === 'string') {
        blueprintBox.innerHTML = blueprintObj; rendered = true;
      } else if (blueprintObj instanceof HTMLElement || blueprintObj instanceof SVGElement) {
        blueprintBox.appendChild(blueprintObj.cloneNode(true)); rendered = true;
      }
    }

    if (!rendered) {
      const remote = await fetchRemoteBlueprint(floorKey);
      renderBlueprintPaths(remote, floorKey, blueprintBox);
      return;
    }

    renderPins(floorKey, blueprintBox);
  } catch (error) {
    console.warn(`Failed to render map ${floorKey}:`, error);
    try {
      const remote = await fetchRemoteBlueprint(floorKey);
      renderBlueprintPaths(remote, floorKey, blueprintBox);
    } catch (remoteError) {
      console.warn(`Failed to fetch remote blueprint ${floorKey}:`, remoteError);
      showFallbackGrid(blueprintBox, floorKey);
    }
  }
}

function updateSelectedRoom(roomId) {
  selectedRoomId = roomId;
  const room = roomsState[roomId];
  const badge = document.getElementById('selected-room-id');
  const container = document.getElementById('room-detail-container');
  if (!badge || !container) return;

  badge.textContent = room?.roomName || roomId.toUpperCase();
  if (!room) {
    container.innerHTML = '<div class="text-center py-12 text-slate-400 font-light"><i class="fa-solid fa-compass text-4xl mb-3 block opacity-40"></i><p class="text-sm">マップ上の部屋やブースを選択すると<br>詳細情報が表示されます</p></div>';
    return;
  }

  const meta = categoryMeta(room.category);
  const tagsHtml = Array.isArray(room.tags)
    ? room.tags.map((tag) => `<span class="text-[11px] px-2 py-0.5 bg-gray-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded">#${escapeHtml(tag)}</span>`).join(' ')
    : '';

  container.innerHTML = `
    <div class="space-y-4 animate-fade-in">
      <div class="flex items-center justify-between gap-3">
        <span class="text-xs font-bold text-slate-400 font-mono">${escapeHtml(room.roomName || roomId)}</span>
        <span class="px-2 py-0.5 text-xs font-medium rounded ${meta.cls}">${meta.label}</span>
      </div>
      <h4 class="text-xl font-bold text-slate-900 dark:text-white border-b border-gray-100 dark:border-slate-700 pb-2">${escapeHtml(room.title || '名称未設定')}</h4>
      <p class="text-sm text-slate-600 dark:text-slate-300 font-light leading-relaxed whitespace-pre-wrap">${escapeHtml(room.description || '詳細情報はまだ入力されていません。')}</p>
      ${tagsHtml ? `<div class="flex flex-wrap gap-1 pt-2">${tagsHtml}</div>` : ''}
    </div>
  `;
}

window.selectRoom = updateSelectedRoom;

window.switchFloor = async function switchFloor(floorKey) {
  currentFloor = floorKey;
  document.querySelectorAll('.floor-btn').forEach((button) => {
    button.classList.remove('active-floor', 'bg-slate-900', 'text-white', 'dark:bg-white', 'dark:text-slate-900', 'border-transparent');
    button.classList.add('border-gray-300', 'dark:border-slate-700', 'text-slate-700', 'dark:text-slate-300');
  });

  const active = document.getElementById(`btn-${floorKey}`);
  if (active) {
    active.classList.add('active-floor', 'bg-slate-900', 'text-white', 'dark:bg-white', 'dark:text-slate-900', 'border-transparent');
    active.classList.remove('border-gray-300', 'dark:border-slate-700', 'text-slate-700', 'dark:text-slate-300');
  }

  const title = document.getElementById('current-floor-title');
  if (title) title.querySelector('span').textContent = floorTitles[floorKey] || 'フロアマップ';
  await renderMap(floorKey);
}

onSnapshot(collection(db, ...MAP_COLLECTION), (snapshot) => {
  Object.keys(roomsState).forEach((key) => delete roomsState[key]);
  snapshot.forEach((doc) => {
    roomsState[doc.id] = doc.data();
  });
  renderMap(currentFloor);
  if (selectedRoomId && roomsState[selectedRoomId]) updateSelectedRoom(selectedRoomId);
}, (error) => {
  console.error('会場マップ情報の取得に失敗しました:', error);
  const detail = document.getElementById('room-detail-container');
  if (detail) {
    detail.innerHTML = '<div class="text-center py-12 text-red-500 dark:text-red-400"><i class="fa-solid fa-triangle-exclamation text-3xl mb-3 block"></i><p class="text-sm leading-relaxed">会場データを読み込めませんでした。<br>Firebaseの設定とFirestoreルールを確認してください。</p></div>';
  }
});

window.addEventListener('DOMContentLoaded', () => {
  window.switchFloor('h1');
});
