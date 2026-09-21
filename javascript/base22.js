import { getApp, getApps, initializeApp } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import {
  getAuth,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut
} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import {
  collection,
  deleteDoc,
  doc,
  getFirestore,
  onSnapshot,
  setDoc
} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';

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
const auth = getAuth(app);
const db = getFirestore(app);
const MAP_COLLECTION = ['artifacts', 'soei-day-2026', 'public', 'data', 'map_rooms'];

const floorTitles = {
  h1: '本館 1F',
  h2: '本館 2F',
  h3: '本館 3F / 新館 B1F',
  s1: '本館 4F / 新館 1F / 体育館',
  s2: '新館 2F',
  s3: '新館 3F'
};

const rooms = {};
let activeFloor = 'h1';
let editingId = null;

const els = {
  loginPanel: document.getElementById('login-panel'),
  postPanel: document.getElementById('post-panel'),
  loginForm: document.getElementById('login-form'),
  loginEmail: document.getElementById('login-email'),
  loginPassword: document.getElementById('login-password'),
  loginButton: document.getElementById('login-button'),
  resetButton: document.getElementById('reset-button'),
  loginMessage: document.getElementById('login-message'),
  currentUser: document.getElementById('current-user'),
  logoutButton: document.getElementById('logout-button'),
  roomForm: document.getElementById('room-form'),
  roomId: document.getElementById('room-id'),
  roomFloor: document.getElementById('room-floor'),
  roomName: document.getElementById('room-name'),
  roomTitle: document.getElementById('room-title'),
  roomCategory: document.getElementById('room-category'),
  roomDescription: document.getElementById('room-description'),
  roomTags: document.getElementById('room-tags'),
  roomPosX: document.getElementById('room-pos-x'),
  roomPosY: document.getElementById('room-pos-y'),
  saveButton: document.getElementById('save-button'),
  newButton: document.getElementById('new-button'),
  deleteButton: document.getElementById('delete-button'),
  postMessage: document.getElementById('post-message'),
  editingStatus: document.getElementById('editing-status'),
  blueprintTarget: document.getElementById('admin-blueprint-target'),
  roomList: document.getElementById('room-list'),
  roomCount: document.getElementById('room-count')
};

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function categoryColor(category) {
  if (category === 'exhibition') return 'bg-brand-lime text-slate-900';
  if (category === 'stage') return 'bg-blue-500 text-white';
  if (category === 'other') return 'bg-slate-500 text-white';
  return 'bg-brand-orange text-white';
}

function setMessage(message, error = false) {
  els.postMessage.textContent = message;
  els.postMessage.className = `status-message ${error ? 'text-red-600 dark:text-red-400' : 'text-brand-lime dark:text-brand-limeDark'}`;
}

function setLoginMessage(message, error = false) {
  els.loginMessage.textContent = message;
  els.loginMessage.className = `status-message ${error ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'}`;
}

function setLoading(button, loading, icon, text) {
  button.disabled = loading;
  button.classList.toggle('opacity-60', loading);
  button.classList.toggle('cursor-not-allowed', loading);
  button.innerHTML = loading
    ? `<i class="fa-solid fa-spinner fa-spin"></i>${escapeHtml(text)}中…`
    : `<i class="fa-solid ${icon}"></i>${escapeHtml(text)}`;
}

function authError(error) {
  const map = {
    'auth/invalid-credential': 'メールアドレスまたはパスワードが正しくありません。',
    'auth/invalid-email': 'メールアドレスの形式を確認してください。',
    'auth/too-many-requests': '試行回数が多いため、一時的にログインを制限しています。時間を置いて再度お試しください。',
    'auth/user-disabled': 'このユーザーは無効化されています。',
    'auth/network-request-failed': 'ネットワーク接続を確認してください。'
  };
  return map[error?.code] || '処理に失敗しました。Firebase Consoleの設定を確認してください。';
}

function normalizePercent(value) {
  const raw = String(value ?? '').trim().replace('%', '');
  const number = Number(raw);
  if (!Number.isFinite(number) || number < 0 || number > 100) return null;
  return `${number}%`;
}

function resetForm() {
  editingId = null;
  els.roomForm.reset();
  els.roomFloor.value = activeFloor;
  els.roomCategory.value = 'food';
  els.roomPosX.value = '50%';
  els.roomPosY.value = '50%';
  els.editingStatus.textContent = '新規投稿';
  els.deleteButton.classList.add('is-hidden');
  setMessage('');
  renderMap(activeFloor);
  renderRoomList();
}

function loadRoom(roomId) {
  const room = rooms[roomId];
  if (!room) return;
  editingId = roomId;
  activeFloor = room.floor || activeFloor;
  els.roomId.value = roomId;
  els.roomFloor.value = activeFloor;
  els.roomName.value = room.roomName || '';
  els.roomTitle.value = room.title || '';
  els.roomCategory.value = room.category || 'food';
  els.roomDescription.value = room.description || '';
  els.roomTags.value = Array.isArray(room.tags) ? room.tags.join(', ') : '';
  els.roomPosX.value = room.posX || '50%';
  els.roomPosY.value = room.posY || '50%';
  els.editingStatus.textContent = `編集中：${roomId}`;
  els.deleteButton.classList.remove('is-hidden');
  setMessage('');
  setFloor(activeFloor);
  renderRoomList();
}

function setFloor(floorKey) {
  activeFloor = floorKey;
  els.roomFloor.value = floorKey;
  document.querySelectorAll('.admin-floor-btn').forEach((button) => {
    const active = button.dataset.floor === floorKey;
    button.classList.toggle('active-floor', active);
    button.classList.toggle('bg-slate-900', active);
    button.classList.toggle('text-white', active);
    button.classList.toggle('border-transparent', active);
    button.classList.toggle('border-gray-300', !active);
    button.classList.toggle('dark:border-slate-700', !active);
    button.classList.toggle('text-slate-700', !active);
    button.classList.toggle('dark:text-slate-300', !active);
  });
  renderMap(floorKey);
  renderRoomList();
}

function mapObjectForFloor(floorKey) {
  const keys = [`blueprint_${floorKey}`, floorKey, `blueprint${floorKey.toUpperCase()}`, `${floorKey}Blueprint`, `blueprint_${floorKey}`];
  for (const key of keys) if (window[key]) return window[key];
  return null;
}

async function fetchRemoteBlueprint(floorKey) {
  const response = await fetch(`https://www.soei-fes.com/blueprint/${floorKey}.js`, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Blueprint fetch failed: ${response.status}`);
  const text = await response.text();

  const match = text.match(/(?:const|let|var)\s+mapData\s*=\s*([\[{])/);
  if (!match) throw new Error(`mapData declaration not found in ${floorKey}.js`);

  const start = match.index + match[0].lastIndexOf(match[1]);
  return JSON.parse(extractBalancedJson(text, start));
}

function extractBalancedJson(text, start) {
  const opening = text[start];
  const closing = opening === '{' ? '}' : ']';
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i += 1) {
    const ch = text[i];

    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }

    if (ch === '"') { inString = true; continue; }
    if (ch === opening) depth += 1;
    if (ch === closing) depth -= 1;
    if (depth === 0) return text.slice(start, i + 1);
  }

  throw new Error('Unbalanced JSON data');
}

function normalizeBlueprintPaths(mapDataObj, floorKey) {
  if (Array.isArray(mapDataObj)) return mapDataObj;
  if (!mapDataObj || typeof mapDataObj !== 'object') return null;

  const patterns = {
    h1: ['h1', '本館1', '本館 1'],
    h2: ['h2', '本館2', '本館 2'],
    h3: ['h3', '本館3', '本館 3', '新館b1', '新館 b1'],
    s1: ['s1', '新館1', '新館 1', '本館4', '本館 4', '体育館'],
    s2: ['s2', '新館2', '新館 2'],
    s3: ['s3', '新館3', '新館 3']
  };

  if (Array.isArray(mapDataObj.paths)) return mapDataObj.paths;
  if (Array.isArray(mapDataObj.elements)) return mapDataObj.elements;
  if (Array.isArray(mapDataObj.items)) return mapDataObj.items;

  const wanted = patterns[floorKey] || [floorKey];
  for (const [key, value] of Object.entries(mapDataObj)) {
    if (Array.isArray(value) && wanted.some((pattern) => key.toLowerCase().includes(pattern.toLowerCase()))) return value;
  }

  return Object.values(mapDataObj).find(Array.isArray) || null;
}

function renderMapPaths(mapDataObj, floorKey, target) {
  const current = normalizeBlueprintPaths(mapDataObj, floorKey);
  if (!Array.isArray(current)) return renderFallbackMap(target, floorKey);

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const paths = current.map((item) => {
    const attrs = Object.entries(item.attributes || {}).map(([key, value]) => `${escapeHtml(key)}="${escapeHtml(value)}"`).join(' ');
    if (item.attributes?.d) {
      const parts = String(item.attributes.d).trim().split(/\s+/);
      for (let i = 0; i < parts.length; i += 1) {
        const cmd = parts[i].toUpperCase();
        if (cmd === 'M' || cmd === 'L') {
          const x = Number.parseFloat(parts[i + 1]);
          const y = Number.parseFloat(parts[i + 2]);
          if (Number.isFinite(x) && Number.isFinite(y)) {
            minX = Math.min(minX, x); maxX = Math.max(maxX, x);
            minY = Math.min(minY, y); maxY = Math.max(maxY, y);
          }
        }
      }
    }
    const tagName = item.type || 'path';
    return `<${tagName} id="${escapeHtml(item.id || '')}" ${attrs}></${tagName}>`;
  }).join('');

  const padX = Number.isFinite(minX) ? ((maxX - minX) * 0.05 || 50) : 100;
  const padY = Number.isFinite(minY) ? ((maxY - minY) * 0.05 || 50) : 100;
  const viewBox = Number.isFinite(minX)
    ? `${Math.max(0, minX - padX)} ${Math.max(0, minY - padY)} ${(maxX - minX) + padX * 2} ${(maxY - minY) + padY * 2}`
    : '0 0 5000 2000';

  target.innerHTML = `
    <div id="map-click-surface" class="relative w-full h-full flex items-center justify-center p-2">
      <svg viewBox="${viewBox}" class="w-full h-full max-h-[600px] drop-shadow-sm pointer-events-none" preserveAspectRatio="xMidYMid meet">${paths}</svg>
      <div id="admin-pins-layer" class="absolute inset-0 pointer-events-auto"></div>
    </div>
  `;
  bindMapPlacement(document.getElementById('map-click-surface'));
  renderAdminPins(floorKey);
}

function renderFallbackMap(target, floorKey) {
  target.innerHTML = `
    <div id="map-click-surface" class="relative w-full h-[400px] bg-slate-100 dark:bg-slate-950 flex items-center justify-center rounded overflow-hidden">
      <svg class="absolute inset-0 w-full h-full stroke-slate-300 dark:stroke-slate-800 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
        <defs><pattern id="grid-admin-${floorKey}" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M 40 0 L 0 0 0 40" fill="none" stroke-width="0.5"/></pattern></defs>
        <rect width="100%" height="100%" fill="url(#grid-admin-${floorKey})"></rect>
      </svg>
      <div id="admin-pins-layer" class="absolute inset-0 pointer-events-auto"></div>
      <div class="relative z-10 text-xs text-slate-400 pointer-events-none">フロア図を読み込めませんでした。配置座標はこのエリアを基準に設定できます。</div>
    </div>
  `;
  bindMapPlacement(document.getElementById('map-click-surface'));
  renderAdminPins(floorKey);
}

function getBlueprintSvg(container) {
  return container?.querySelector?.('svg') || null;
}

function percentValue(value) {
  const raw = String(value ?? '').trim().replace('%', '');
  const number = Number(raw);
  return Number.isFinite(number) ? Math.max(0, Math.min(100, number)) : 50;
}

function positionPinOnBlueprint(pin, layer, svg, posX, posY) {
  const xPercent = percentValue(posX);
  const yPercent = percentValue(posY);

  if (!svg || !layer || typeof svg.getScreenCTM !== 'function' || !svg.viewBox?.baseVal) {
    pin.style.left = `${xPercent}%`;
    pin.style.top = `${yPercent}%`;
    return;
  }

  const viewBox = svg.viewBox.baseVal;
  const ctm = svg.getScreenCTM();
  if (!ctm || !viewBox.width || !viewBox.height) {
    pin.style.left = `${xPercent}%`;
    pin.style.top = `${yPercent}%`;
    return;
  }

  const point = svg.createSVGPoint();
  point.x = viewBox.x + (viewBox.width * xPercent / 100);
  point.y = viewBox.y + (viewBox.height * yPercent / 100);
  const screenPoint = point.matrixTransform(ctm);
  const layerRect = layer.getBoundingClientRect();

  pin.style.left = `${screenPoint.x - layerRect.left}px`;
  pin.style.top = `${screenPoint.y - layerRect.top}px`;
}

function repositionAdminPins(container) {
  const surface = container?.querySelector?.('#map-click-surface') || container;
  const layer = surface?.querySelector?.('#admin-pins-layer') || container?.querySelector?.('#admin-pins-layer');
  const svg = getBlueprintSvg(container);
  if (!layer) return;

  layer.querySelectorAll('[data-pos-x][data-pos-y]').forEach((pin) => {
    positionPinOnBlueprint(pin, layer, svg, pin.dataset.posX, pin.dataset.posY);
  });
}

function bindMapPlacement(clickTarget) {
  if (!clickTarget || clickTarget.dataset.mapClickBound === 'true') return;
  clickTarget.dataset.mapClickBound = 'true';
  clickTarget.addEventListener('click', (event) => {
    if (event.target.closest('button')) return;

    const svg = getBlueprintSvg(clickTarget);
    if (svg && typeof svg.getScreenCTM === 'function' && svg.viewBox?.baseVal) {
      const ctm = svg.getScreenCTM();
      if (ctm) {
        const point = svg.createSVGPoint();
        point.x = event.clientX;
        point.y = event.clientY;
        const local = point.matrixTransform(ctm.inverse());
        const viewBox = svg.viewBox.baseVal;

        const xPercent = ((local.x - viewBox.x) / viewBox.width) * 100;
        const yPercent = ((local.y - viewBox.y) / viewBox.height) * 100;

        if (xPercent < 0 || xPercent > 100 || yPercent < 0 || yPercent > 100) return;

        els.roomPosX.value = `${xPercent.toFixed(2)}%`;
        els.roomPosY.value = `${yPercent.toFixed(2)}%`;
        setMessage('配置位置を更新しました。保存すると反映されます。');
        return;
      }
    }

    const rect = clickTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const x = Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((event.clientY - rect.top) / rect.height) * 100));
    els.roomPosX.value = `${x.toFixed(2)}%`;
    els.roomPosY.value = `${y.toFixed(2)}%`;
    setMessage('配置位置を更新しました。保存すると反映されます。');
  });
}

function renderAdminPins(floorKey) {
  const surface = els.blueprintTarget.querySelector('#map-click-surface') || els.blueprintTarget;
  let layer = surface.querySelector('#admin-pins-layer');
  if (!layer) {
    layer = document.createElement('div');
    layer.id = 'admin-pins-layer';
    layer.className = 'absolute inset-0 pointer-events-auto';
    surface.appendChild(layer);
  }
  layer.innerHTML = '';

  Object.entries(rooms).forEach(([id, room]) => {
    if (room.floor !== floorKey) return;
    const posX = room.posX || '50%';
    const posY = room.posY || '50%';
    const pin = document.createElement('div');
    pin.className = 'map-editor-pin';
    pin.dataset.posX = posX;
    pin.dataset.posY = posY;
    pin.innerHTML = `<button type="button" title="${escapeHtml(room.title || id)}" class="px-2.5 py-1.5 ${categoryColor(room.category)} font-bold text-[11px] shadow-md rounded-full flex items-center gap-1.5 hover:scale-105 transition-transform"><i class="fa-solid fa-location-dot"></i><span>${escapeHtml(room.roomName || id)}</span></button>`;
    pin.querySelector('button').addEventListener('click', (event) => {
      event.stopPropagation();
      loadRoom(id);
    });
    layer.appendChild(pin);
  });

  requestAnimationFrame(() => repositionAdminPins(els.blueprintTarget));
}

async function renderMap(floorKey) {
  const target = els.blueprintTarget;
  target.innerHTML = '<div class="text-center text-slate-400 font-light py-16"><i class="fa-solid fa-spinner fa-spin text-2xl mb-3 block"></i>マップを読み込んでいます...</div>';
  try {
    const obj = mapObjectForFloor(floorKey);
    let rendered = false;
    const box = document.createElement('div');
    box.className = 'w-full h-full relative flex items-center justify-center min-h-[420px] bg-white dark:bg-slate-900 border border-dashed border-gray-300 dark:border-slate-700 p-4 rounded-sm';
    target.innerHTML = '';
    target.appendChild(box);

    if (obj) {
      if (typeof obj.render === 'function') { obj.render(box); rendered = true; }
      else if (typeof obj.draw === 'function') { obj.draw(box); rendered = true; }
      else if (typeof obj.init === 'function') { obj.init(box); rendered = true; }
      else if (typeof obj === 'function') { obj(box); rendered = true; }
      else if (typeof obj === 'string') { box.innerHTML = obj; rendered = true; }
      else if (obj instanceof HTMLElement || obj instanceof SVGElement) { box.appendChild(obj.cloneNode(true)); rendered = true; }
    }

    if (!rendered) {
      const remote = await fetchRemoteBlueprint(floorKey);
      renderMapPaths(remote, floorKey, box);
      return;
    }
    let pinLayer = box.querySelector('#admin-pins-layer');
    if (!pinLayer) {
      pinLayer = document.createElement('div');
      pinLayer.id = 'admin-pins-layer';
      pinLayer.className = 'absolute inset-0 pointer-events-auto';
      box.appendChild(pinLayer);
    }
    bindMapPlacement(box);
    renderAdminPins(floorKey);
  } catch (error) {
    console.warn(`Failed to render map ${floorKey}:`, error);
    try {
      const remote = await fetchRemoteBlueprint(floorKey);
      target.innerHTML = '';
      const box = document.createElement('div');
      box.className = 'w-full h-full relative flex items-center justify-center min-h-[420px] bg-white dark:bg-slate-900 border border-dashed border-gray-300 dark:border-slate-700 p-4 rounded-sm';
      target.appendChild(box);
      renderMapPaths(remote, floorKey, box);
    } catch (remoteError) {
      console.warn(`Failed to fetch remote blueprint ${floorKey}:`, remoteError);
      target.innerHTML = '';
      renderFallbackMap(target, floorKey);
    }
  }
}

function renderRoomList() {
  const entries = Object.entries(rooms).filter(([, room]) => room.floor === activeFloor).sort(([, a], [, b]) => String(a.roomName || '').localeCompare(String(b.roomName || ''), 'ja'));
  els.roomCount.textContent = String(entries.length);
  if (!entries.length) {
    els.roomList.innerHTML = '<div class="text-center py-8 text-slate-400 text-sm">このフロアには登録されていません。</div>';
    return;
  }
  els.roomList.innerHTML = entries.map(([id, room]) => `
    <button type="button" data-room-id="${escapeHtml(id)}" class="room-list-button w-full text-left border border-gray-200 dark:border-slate-700 rounded-sm p-3 hover:border-brand-orange transition-colors ${editingId === id ? 'active' : ''}">
      <div class="flex items-center justify-between gap-3">
        <span class="text-xs font-mono text-brand-orange font-bold">${escapeHtml(room.roomName || id)}</span>
        <span class="text-[10px] text-slate-400 font-sans">${escapeHtml(room.category || '')}</span>
      </div>
      <p class="text-sm font-bold text-slate-900 dark:text-white mt-1">${escapeHtml(room.title || '名称未設定')}</p>
    </button>
  `).join('');
  els.roomList.querySelectorAll('[data-room-id]').forEach((button) => button.addEventListener('click', () => loadRoom(button.dataset.roomId)));
}

els.loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setLoginMessage('');
  if (!els.loginForm.reportValidity()) return;
  setLoading(els.loginButton, true, 'right-to-bracket', 'ログイン');
  try {
    await signInWithEmailAndPassword(auth, els.loginEmail.value.trim(), els.loginPassword.value);
    els.loginPassword.value = '';
  } catch (error) {
    console.error(error);
    setLoginMessage(authError(error), true);
  } finally {
    setLoading(els.loginButton, false, 'right-to-bracket', 'ログイン');
  }
});

els.resetButton.addEventListener('click', async () => {
  const email = els.loginEmail.value.trim();
  if (!email || !els.loginEmail.checkValidity()) {
    setLoginMessage('パスワード再設定を行うメールアドレスを入力してください。', true);
    els.loginEmail.focus();
    return;
  }
  try {
    await sendPasswordResetEmail(auth, email);
    setLoginMessage('パスワード再設定メールを送信しました。');
  } catch (error) {
    console.error(error);
    setLoginMessage('パスワード再設定メールを送信できませんでした。登録済みのメールアドレスか確認してください。', true);
  }
});

els.logoutButton.addEventListener('click', async () => {
  try { await signOut(auth); } catch (error) { console.error(error); setMessage('ログアウトに失敗しました。', true); }
});

document.querySelectorAll('.admin-floor-btn').forEach((button) => {
  button.addEventListener('click', () => setFloor(button.dataset.floor));
});

els.roomFloor.addEventListener('change', () => setFloor(els.roomFloor.value));
els.newButton.addEventListener('click', resetForm);

els.roomForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setMessage('');
  const user = auth.currentUser;
  if (!user) {
    setMessage('認証状態を確認できません。もう一度ログインしてください。', true);
    return;
  }
  if (!els.roomForm.reportValidity()) return;

  const roomId = els.roomId.value.trim();
  const posX = normalizePercent(els.roomPosX.value);
  const posY = normalizePercent(els.roomPosY.value);
  if (!posX || !posY) {
    setMessage('X位置とY位置は0〜100%の範囲で入力してください。', true);
    return;
  }

  const data = {
    floor: els.roomFloor.value,
    roomName: els.roomName.value.trim(),
    title: els.roomTitle.value.trim(),
    category: els.roomCategory.value,
    description: els.roomDescription.value.trim(),
    tags: els.roomTags.value.split(',').map((tag) => tag.trim()).filter(Boolean).slice(0, 20),
    posX,
    posY,
    authorUid: user.uid
  };

  setLoading(els.saveButton, true, 'floppy-disk', '保存する');
  try {
    await setDoc(doc(db, ...MAP_COLLECTION, roomId), data);
    editingId = roomId;
    activeFloor = data.floor;
    els.editingStatus.textContent = `編集中：${roomId}`;
    els.deleteButton.classList.remove('is-hidden');
    setMessage('保存しました。公開ページに反映されます。');
  } catch (error) {
    console.error(error);
    setMessage('保存に失敗しました。FirestoreのセキュリティルールとFirebase設定を確認してください。', true);
  } finally {
    setLoading(els.saveButton, false, 'floppy-disk', '保存する');
  }
});

els.deleteButton.addEventListener('click', async () => {
  if (!editingId) return;
  if (!window.confirm(`「${editingId}」を削除しますか？\nこの操作は元に戻せません。`)) return;
  try {
    await deleteDoc(doc(db, ...MAP_COLLECTION, editingId));
    resetForm();
    setMessage('削除しました。');
  } catch (error) {
    console.error(error);
    setMessage('削除に失敗しました。', true);
  }
});

onSnapshot(collection(db, ...MAP_COLLECTION), (snapshot) => {
  Object.keys(rooms).forEach((key) => delete rooms[key]);
  snapshot.forEach((item) => { rooms[item.id] = item.data(); });
  renderRoomList();
  renderMap(activeFloor);
}, (error) => {
  console.error('会場マップデータ取得エラー:', error);
  renderRoomList();
  setMessage('会場データの取得に失敗しました。FirestoreルールとFirebase設定を確認してください。', true);
});

onAuthStateChanged(auth, (user) => {
  if (user) {
    els.loginPanel.classList.add('is-hidden');
    els.postPanel.classList.remove('is-hidden');
    els.currentUser.textContent = `ログイン中：${user.email || '認証済みユーザー'}`;
    if (!editingId) resetForm();
  } else {
    els.loginPanel.classList.remove('is-hidden');
    els.postPanel.classList.add('is-hidden');
    els.currentUser.textContent = '';
  }
});

window.addEventListener('resize', () => {
  repositionAdminPins(els.blueprintTarget);
});
