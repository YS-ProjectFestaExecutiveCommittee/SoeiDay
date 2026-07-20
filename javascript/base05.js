import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, onSnapshot } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCDWj4xWfU42x2NG1tOSlXcBC-f2vhC3lA",
  authDomain: "soeiday.firebaseapp.com",
  projectId: "soeiday",
  storageBucket: "soeiday.firebasestorage.app",
  messagingSenderId: "122257503471",
  appId: "1:122257503471:web:8014972f2bc10f84ea971a",
  measurementId: "G-EX7FJGF5R0"
};
const appId = typeof __app_id !== 'undefined' ? __app_id : 'soei-fes-app';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let unsubscribe = null;
window.newsData = [];

window.openModal = function(id) {
  const item = window.newsData.find(d => d.id === id);
  if (!item) return;

  document.getElementById('modal-date').textContent = item.date || '----.--.--';
  document.getElementById('modal-category').textContent = item.type === 'topic' ? 'トピック' : 'ニュースリリース';
  document.getElementById('modal-title').textContent = item.title || '無題';
  
  const bodyEl = document.getElementById('modal-body');
  if (item.content) {
    bodyEl.innerHTML = item.content.replace(/\n/g, '<br>');
  } else {
    bodyEl.innerHTML = '';
  }

  const imgContainer = document.getElementById('modal-image-container');
  const imgEl = document.getElementById('modal-image');
  if (item.image) {
    imgEl.src = item.image; 
    imgContainer.classList.remove('hidden');
  } else {
    imgEl.src = '';
    imgContainer.classList.add('hidden');
  }

  const vidContainer = document.getElementById('modal-video-container');
  if (item.video) {
    vidContainer.innerHTML = item.video; 
    vidContainer.classList.remove('hidden');
  } else {
    vidContainer.innerHTML = '';
    vidContainer.classList.add('hidden');
  }

  const modal = document.getElementById('article-modal');
  const container = document.getElementById('modal-content-container');
  
  modal.classList.remove('hidden');
  
  setTimeout(() => {
    modal.classList.remove('opacity-0');
    container.classList.remove('scale-95');
    container.classList.add('scale-100');
  }, 10);
  document.body.classList.add('modal-open');
};

window.closeModal = function() {
  const modal = document.getElementById('article-modal');
  const container = document.getElementById('modal-content-container');
  
  modal.classList.add('opacity-0');
  container.classList.remove('scale-100');
  container.classList.add('scale-95');
  
  setTimeout(() => {
    modal.classList.add('hidden');
    document.body.classList.remove('modal-open');
    
    document.getElementById('modal-video-container').innerHTML = '';
  }, 300); 
};

const renderList = (items, containerId) => {
  const container = document.getElementById(containerId);
  if (items.length === 0) {
    container.innerHTML = '<div class="py-10 pl-4 text-slate-500 font-light tracking-wider">現在、お知らせはありません。</div>';
    return;
  }

  let html = '';
  items.forEach(item => {
    html += `
      <div class="group flex flex-col sm:flex-row sm:items-center border-b border-gray-200 dark:border-slate-700 py-6 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition duration-300 px-4" onclick="openModal('${item.id}')">
        <div class="flex items-center sm:w-40 mb-2 sm:mb-0 shrink-0">
          <span class="text-sm font-medium tracking-widest text-slate-500 dark:text-slate-400 font-sans">${item.date || ''}</span>
        </div>
        <div class="flex-grow">
          <h3 class="text-lg font-medium text-slate-900 dark:text-slate-100 group-hover:text-brand-orange dark:group-hover:text-brand-orangeDark transition-colors leading-relaxed">${item.title || '無題'}</h3>
        </div>
        <div class="shrink-0 mt-2 sm:mt-0 sm:ml-4 text-slate-300 dark:text-slate-600 group-hover:text-brand-orange dark:group-hover:text-brand-orangeDark transition-colors">
          <i class="fa-solid fa-chevron-right text-sm"></i>
        </div>
      </div>
    `;
  });
  container.innerHTML = html;
};

const fetchNews = () => {
  const newsRef = collection(db, 'artifacts', appId, 'public', 'data', 'school_news');
  
  unsubscribe = onSnapshot(newsRef, (snapshot) => {
    const data = [];
    snapshot.forEach(doc => {
      data.push({ id: doc.id, ...doc.data() });
    });

    data.sort((a, b) => {
      const dateA = new Date(a.date || '1970-01-01').getTime();
      const dateB = new Date(b.date || '1970-01-01').getTime();
      return dateB - dateA;
    });

    window.newsData = data;

    const releases = data.filter(item => item.type !== 'topic'); 
    const topics = data.filter(item => item.type === 'topic');

    renderList(releases, 'news-release-container');
    renderList(topics, 'topic-container');
    
  }, (error) => {
    console.error("Firestore fetch error:", error);
    const errorMsg = '<div class="py-8 text-red-500 font-light text-center">データの取得に失敗しました。<br>データベースの接続設定を確認してください。</div>';
    document.getElementById('news-release-container').innerHTML = errorMsg;
    document.getElementById('topic-container').innerHTML = errorMsg;
  });
};

const initAuth = async () => {
  try {
    if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
      try {
        await signInWithCustomToken(auth, __initial_auth_token);
      } catch (tokenError) {
        console.warn("テスト環境の認証キーが一致しませんでした。匿名認証に切り替えます。", tokenError);
        await signInAnonymously(auth);
      }
    } else {
      await signInAnonymously(auth);
    }
  } catch (error) {
    console.error("Auth init failed:", error);
    const errorMsg = '<div class="py-8 text-red-500 font-light text-center">認証に失敗しました。<br>Firebaseの「Authentication」で「匿名」が有効になっているか確認してください。</div>';
    document.getElementById('news-release-container').innerHTML = errorMsg;
    document.getElementById('topic-container').innerHTML = errorMsg;
  }
};

onAuthStateChanged(auth, (user) => {
  if (user) {
    fetchNews();
  } else {
    if (unsubscribe) unsubscribe();
  }
});

initAuth();
