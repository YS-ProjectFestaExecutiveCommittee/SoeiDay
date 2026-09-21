import { getApp, getApps, initializeApp } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import { getAuth, onAuthStateChanged, sendPasswordResetEmail, signInWithEmailAndPassword, signOut } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import { addDoc, collection, deleteDoc, doc, getFirestore, onSnapshot, setDoc, updateDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';
import { FLOOR_TITLES, renderBlueprint, getBlueprintSvg, normalizePercent, percentFromPointerEvent, positionElementFromPercent, addResizeRepositionListener } from './map-blueprint.js';

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
const COLLECTION = 'booths';
const booths = {};
const state = { floor: 'h1', editingId: null, mapShell: null };

const categoryMeta = {
  food: { label: '模擬店・飲食', color: 'bg-brand-orange text-white' },
  exhibition: { label: '展示・体験', color: 'bg-brand-lime text-slate-900' },
  stage: { label: 'ステージ・公演', color: 'bg-blue-500 text-white' },
  other: { label: '本部・休憩所・その他', color: 'bg-slate-500 text-white' }
};

const el = {
  loginPanel: document.getElementById('login-panel'), postPanel: document.getElementById('post-panel'), loginForm: document.getElementById('login-form'),
  loginEmail: document.getElementById('login-email'), loginPassword: document.getElementById('login-password'), loginButton: document.getElementById('login-button'), resetButton: document.getElementById('reset-button'), loginMessage: document.getElementById('login-message'), currentUser: document.getElementById('current-user'), logoutButton: document.getElementById('logout-button'),
  form: document.getElementById('booth-form'), boothFloor: document.getElementById('booth-floor'), title: document.getElementById('booth-title'), roomName: document.getElementById('booth-room'), category: document.getElementById('booth-category'), categoryChoices: document.querySelectorAll('[data-category]'), description: document.getElementById('booth-description'), imageFile: document.getElementById('booth-image'), imagePreview: document.getElementById('image-preview'), imagePreviewWrap: document.getElementById('image-preview-wrap'), imageInfo: document.getElementById('image-info'), youtube: document.getElementById('booth-youtube'), boothUrl: document.getElementById('booth-url'), tags: document.getElementById('booth-tags'), posX: document.getElementById('booth-pos-x'), posY: document.getElementById('booth-pos-y'), save: document.getElementById('save-button'), newButton: document.getElementById('new-button'), deleteButton: document.getElementById('delete-button'), message: document.getElementById('post-message'), status: document.getElementById('editing-status'), mapTarget: document.getElementById('admin-blueprint-target'), list: document.getElementById('booth-list'), count: document.getElementById('booth-count')
};

function escapeHtml(value) {
  return String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
}
function setLoginMessage(message, error = false) { el.loginMessage.textContent = message; el.loginMessage.className = `status-message ${error ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'}`; }
function setMessage(message, error = false) { el.message.textContent = message; el.message.className = `status-message ${error ? 'text-red-600 dark:text-red-400' : 'text-brand-lime dark:text-brand-limeDark'}`; }
function setLoading(button, loading, normalHtml, loadingText) { button.disabled = loading; button.classList.toggle('opacity-60', loading); button.classList.toggle('cursor-not-allowed', loading); button.innerHTML = loading ? `<i class="fa-solid fa-spinner fa-spin"></i>${loadingText}` : normalHtml; }
function categoryColor(value) { return categoryMeta[value]?.color || categoryMeta.other.color; }
function syncCategory() { const value = el.category.value || 'food'; el.categoryChoices.forEach((button) => { const active = button.dataset.category === value; button.classList.toggle('active', active); button.style.backgroundColor = active ? 'rgba(148,163,184,.08)' : ''; }); }
function setCategory(value) { el.category.value = ['food','exhibition','stage','other'].includes(value) ? value : 'food'; syncCategory(); }
function parseTags(value) { return String(value || '').split(',').map((x) => x.trim()).filter(Boolean).slice(0, 20); }
function parseYoutubeId(value) { const raw = String(value || '').trim(); if (!raw) return ''; try { const url = new URL(raw); if (url.hostname.includes('youtu.be')) return url.pathname.replace('/','').slice(0, 11); if (url.hostname.includes('youtube.com')) { const v = url.searchParams.get('v'); if (v) return v.slice(0, 11); const parts = url.pathname.split('/').filter(Boolean); const index = parts.findIndex((part) => ['embed','shorts','live'].includes(part)); if (index >= 0 && parts[index+1]) return parts[index+1].slice(0, 11); } } catch (_) {} const match = raw.match(/[A-Za-z0-9_-]{11}/); return match ? match[0] : ''; }
function validateUrl(value) { if (!value) return true; try { const url = new URL(value); return url.protocol === 'https:' || url.protocol === 'http:'; } catch (_) { return false; } }

async function compressImageToA4(file) {
  if (!file || !file.type.startsWith('image/')) throw new Error('画像ファイルを選択してください。');
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = () => reject(new Error('画像を読み込めませんでした。')); img.src = objectUrl; });
    const targetRatio = 210 / 297;
    const sourceRatio = image.width / image.height;
    let cropW = image.width; let cropH = image.height; let sx = 0; let sy = 0;
    if (sourceRatio > targetRatio) { cropW = image.height * targetRatio; sx = (image.width - cropW) / 2; }
    else if (sourceRatio < targetRatio) { cropH = image.width / targetRatio; sy = (image.height - cropH) / 2; }
    const maxLong = 850;
    const outH = maxLong;
    const outW = Math.round(outH * targetRatio);
    const canvas = document.createElement('canvas'); canvas.width = outW; canvas.height = outH;
    const ctx = canvas.getContext('2d', { alpha: false });
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0,0,outW,outH);
    ctx.drawImage(image, sx, sy, cropW, cropH, 0, 0, outW, outH);
    let quality = 0.84;
    let dataUrl = canvas.toDataURL('image/jpeg', quality);
    while (dataUrl.length > 650000 && quality > 0.48) { quality -= 0.04; dataUrl = canvas.toDataURL('image/jpeg', quality); }
    if (dataUrl.length > 650000) {
      const smallCanvas = document.createElement('canvas'); smallCanvas.width = Math.round(outW * 0.82); smallCanvas.height = Math.round(outH * 0.82); const smallCtx = smallCanvas.getContext('2d'); smallCtx.fillStyle='#fff'; smallCtx.fillRect(0,0,smallCanvas.width,smallCanvas.height); smallCtx.drawImage(canvas,0,0,smallCanvas.width,smallCanvas.height); dataUrl = smallCanvas.toDataURL('image/jpeg', 0.52);
    }
    if (dataUrl.length > 700000) throw new Error('画像を十分に圧縮できませんでした。別の画像でお試しください。');
    return { dataUrl, width: canvas.width, height: canvas.height, quality };
  } finally { URL.revokeObjectURL(objectUrl); }
}

function clearForm() {
  state.editingId = null; el.form.reset(); el.boothFloor.value = state.floor; setCategory('food'); el.posX.value=''; el.posY.value=''; el.youtube.value=''; el.boothUrl.value=''; el.imageFile.value=''; el.imagePreview.removeAttribute('src'); el.imagePreviewWrap.classList.add('is-hidden'); el.imageInfo.textContent=''; el.status.textContent='新規投稿'; el.deleteButton.classList.add('is-hidden'); setMessage(''); renderAdminList(); renderAdminMap();
}
function loadBooth(id) {
  const booth = booths[id]; if (!booth) return; state.editingId = id; state.floor = booth.floor || 'h1'; el.boothFloor.value=state.floor; el.title.value=booth.title||''; el.roomName.value=booth.roomName||''; setCategory(booth.category); el.description.value=booth.description||''; el.youtube.value=booth.youtubeUrl||''; el.boothUrl.value=booth.boothUrl||''; el.tags.value=Array.isArray(booth.tags)?booth.tags.join(', '):''; el.posX.value=booth.posX||''; el.posY.value=booth.posY||''; if (booth.imageData) { el.imagePreview.src=booth.imageData; el.imagePreviewWrap.classList.remove('is-hidden'); el.imageInfo.textContent='保存済み画像'; } else { el.imagePreviewWrap.classList.add('is-hidden'); el.imageInfo.textContent=''; } el.status.textContent=`編集中：${id}`; el.deleteButton.classList.remove('is-hidden'); setMessage(''); setFloor(state.floor); renderAdminList(); }
function setFloor(floorKey) { state.floor=floorKey; el.boothFloor.value=floorKey; document.querySelectorAll('.admin-floor-btn').forEach((button)=>{ const active=button.dataset.floor===floorKey; button.classList.toggle('bg-slate-900',active);button.classList.toggle('text-white',active);button.classList.toggle('border-transparent',active);button.classList.toggle('border-gray-300',!active);button.classList.toggle('dark:border-slate-700',!active); }); renderAdminMap(); renderAdminList(); }

function createPin(booth, id) { const meta=categoryMeta[booth.category]||categoryMeta.other; const pin=document.createElement('div'); pin.className='map-editor-pin absolute'; pin.dataset.posX=booth.posX; pin.dataset.posY=booth.posY; pin.innerHTML=`<button type="button" title="${escapeHtml(booth.title)}" class="px-2.5 py-1.5 ${meta.color} font-bold text-[11px] shadow-md rounded-full flex items-center gap-1.5 hover:scale-105 transition-transform whitespace-nowrap"><i class="fa-solid fa-location-dot"></i><span>${escapeHtml(booth.title)}</span></button>`; pin.querySelector('button').addEventListener('click',(e)=>{e.stopPropagation();loadBooth(id);}); return pin; }
function renderAdminPins() { const surface=state.mapShell?.querySelector('#map-click-surface'); const layer=surface?.querySelector('#admin-pins-layer'); const svg=getBlueprintSvg(state.mapShell); if(!surface||!layer)return; layer.innerHTML=''; Object.entries(booths).forEach(([id,booth])=>{if(booth.floor!==state.floor)return; if(!booth.posX||!booth.posY)return; layer.appendChild(createPin(booth,id));}); const reposition=()=>layer.querySelectorAll('[data-pos-x][data-pos-y]').forEach((pin)=>positionElementFromPercent(pin,layer,svg,pin.dataset.posX,pin.dataset.posY)); requestAnimationFrame(reposition); }
function bindMapPlacement() { const surface=state.mapShell?.querySelector('#map-click-surface'); const svg=getBlueprintSvg(state.mapShell); if(!surface||!svg||surface.dataset.mapBound==='true')return; surface.dataset.mapBound='true'; surface.addEventListener('click',(event)=>{if(event.target.closest('button'))return; const point=percentFromPointerEvent(event,svg); if(!point)return; el.posX.value=point.x; el.posY.value=point.y; setMessage('地図上の位置を更新しました。保存すると反映されます。'); }); }
async function renderAdminMap() { try { state.mapShell=await renderBlueprint(el.mapTarget,state.floor); const shell=state.mapShell; const pinsLayer=document.createElement('div'); pinsLayer.id='admin-pins-layer'; pinsLayer.className='absolute inset-0 pointer-events-auto'; shell.querySelector('#map-click-surface').appendChild(pinsLayer); bindMapPlacement(); renderAdminPins(); } catch(error){console.error(error);el.mapTarget.innerHTML='<div class="map-error flex items-center justify-center text-center text-red-500 dark:text-red-400"><div><i class="fa-solid fa-triangle-exclamation text-3xl mb-3"></i><p class="text-sm leading-relaxed">フロア図を読み込めませんでした。Blueprintファイルの読み込みを確認してください。</p></div></div>';}}
function renderAdminList(){ const entries=Object.entries(booths).filter(([,b])=>b.floor===state.floor).sort(([,a],[,b])=>String(a.title).localeCompare(String(b.title),'ja')); el.count.textContent=String(entries.length); el.list.innerHTML=entries.length?entries.map(([id,b])=>`<button type="button" data-booth-id="${escapeHtml(id)}" class="w-full text-left border border-gray-200 dark:border-slate-700 rounded-sm p-3 hover:border-brand-orange transition"><div class="flex items-center justify-between gap-3"><span class="text-xs text-brand-orange font-bold">${escapeHtml(b.roomName)}</span><span class="text-[10px] text-slate-400">${escapeHtml(categoryMeta[b.category]?.label||'')}</span></div><p class="text-sm font-bold text-slate-900 dark:text-white mt-1">${escapeHtml(b.title)}</p></button>`).join(''):'<div class="text-center py-8 text-slate-400 text-sm">このフロアには登録されていません。</div>'; el.list.querySelectorAll('[data-booth-id]').forEach((button)=>button.addEventListener('click',()=>loadBooth(button.dataset.boothId))); }

el.loginForm.addEventListener('submit',async(event)=>{event.preventDefault();setLoginMessage('');if(!el.loginForm.reportValidity())return;setLoading(el.loginButton,true,'<i class="fa-solid fa-right-to-bracket"></i>ログイン','ログイン中…');try{await signInWithEmailAndPassword(auth,el.loginEmail.value.trim(),el.loginPassword.value);el.loginPassword.value='';}catch(error){console.error(error);setLoginMessage('メールアドレスまたはパスワードが正しくありません。',true);}finally{setLoading(el.loginButton,false,'<i class="fa-solid fa-right-to-bracket"></i>ログイン','');}});
el.resetButton.addEventListener('click',async()=>{const email=el.loginEmail.value.trim();if(!email||!el.loginEmail.checkValidity()){setLoginMessage('パスワード再設定を行うメールアドレスを入力してください。',true);return;}try{await sendPasswordResetEmail(auth,email);setLoginMessage('パスワード再設定メールを送信しました。');}catch(error){console.error(error);setLoginMessage('パスワード再設定メールを送信できませんでした。',true);}});
el.logoutButton.addEventListener('click',()=>signOut(auth).catch((e)=>{console.error(e);setMessage('ログアウトに失敗しました。',true);}));
el.categoryChoices.forEach((button)=>button.addEventListener('click',()=>setCategory(button.dataset.category)));
document.querySelectorAll('.admin-floor-btn').forEach((button)=>button.addEventListener('click',()=>setFloor(button.dataset.floor)));
el.boothFloor.addEventListener('change',()=>setFloor(el.boothFloor.value));
el.newButton.addEventListener('click',clearForm);
el.imageFile.addEventListener('change',async()=>{const file=el.imageFile.files?.[0];if(!file)return;try{const result=await compressImageToA4(file);el.imagePreview.src=result.dataUrl;el.imagePreviewWrap.classList.remove('is-hidden');el.imageInfo.textContent=`${result.width} × ${result.height}px / Base64化・圧縮済み`;el.imageFile._compressedData=result.dataUrl;setMessage('画像をA4縦比率・長辺850px以内に変換しました。');}catch(error){console.error(error);el.imageFile.value='';el.imageFile._compressedData='';setMessage(error.message,true);}});

el.form.addEventListener('submit',async(event)=>{event.preventDefault();setMessage('');const user=auth.currentUser;if(!user){setMessage('認証状態を確認できません。',true);return;}if(!el.form.reportValidity())return;const tags=parseTags(el.tags.value);if(!tags.length){setMessage('タグを1つ以上入力してください。',true);return;}const posX=normalizePercent(el.posX.value),posY=normalizePercent(el.posY.value);if(!posX||!posY){setMessage('地図上をクリックして位置を設定してください。',true);return;}const youtubeUrl=el.youtube.value.trim();const youtubeId=parseYoutubeId(youtubeUrl);if(youtubeUrl&&!youtubeId){setMessage('YouTubeリンクを認識できませんでした。',true);return;}const boothUrl=el.boothUrl.value.trim();if(!validateUrl(boothUrl)){setMessage('ブースごとのページURLはhttp://またはhttps://で入力してください。',true);return;}
  let imageData=el.imageFile._compressedData||''; if(!imageData&&state.editingId){imageData=booths[state.editingId]?.imageData||'';} if(!imageData){setMessage('画像を選択してください。',true);return;}
  const payload={floor:el.boothFloor.value,title:el.title.value.trim(),roomName:el.roomName.value.trim(),category:el.category.value,description:el.description.value.trim(),imageData,youtubeId,youtubeUrl,boothUrl,tags,posX,posY,published:true,authorUid:user.uid,updatedAt:serverTimestamp()};
  if(state.editingId){payload.createdAt=booths[state.editingId]?.createdAt||serverTimestamp();}else{payload.createdAt=serverTimestamp();}
  setLoading(el.save,true,'','保存中…');
  try{if(state.editingId)await updateDoc(doc(db,COLLECTION,state.editingId),payload);else{const ref=await addDoc(collection(db,COLLECTION),payload);state.editingId=ref.id;}el.status.textContent=`編集中：${state.editingId}`;el.deleteButton.classList.remove('is-hidden');setMessage('保存しました。出店案内と会場マップの両方に反映されます。');}catch(error){console.error(error);setMessage('保存に失敗しました。Firestore RulesとFirebase設定を確認してください。',true);}finally{setLoading(el.save,false,'','保存する');}
});
el.deleteButton.addEventListener('click',async()=>{if(!state.editingId)return;if(!confirm('このブースを削除しますか？\n出店案内と会場マップの両方から削除されます。'))return;try{await deleteDoc(doc(db,COLLECTION,state.editingId));clearForm();setMessage('削除しました。');}catch(error){console.error(error);setMessage('削除に失敗しました。',true);}});

onSnapshot(collection(db,COLLECTION),(snapshot)=>{Object.keys(booths).forEach((id)=>delete booths[id]);snapshot.forEach((item)=>{booths[item.id]=item.data();});renderAdminList();renderAdminMap();},(error)=>{console.error(error);setMessage('出店データの取得に失敗しました。Firestore Rulesを確認してください。',true);});
onAuthStateChanged(auth,(user)=>{if(user){el.loginPanel.classList.add('is-hidden');el.postPanel.classList.remove('is-hidden');el.currentUser.textContent=`ログイン中：${user.email||'認証済みユーザー'}`;if(!state.editingId)clearForm();}else{el.loginPanel.classList.remove('is-hidden');el.postPanel.classList.add('is-hidden');el.currentUser.textContent='';}});
addResizeRepositionListener(()=>renderAdminPins());
window.addEventListener('DOMContentLoaded',()=>setFloor('h1'));
