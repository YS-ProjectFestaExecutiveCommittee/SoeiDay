import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
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

const app = initializeApp(firebaseConfig);
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

if (/<[a-z][\s\S]*>/i.test(item.content)) {
    bodyEl.innerHTML = item.content;
    } else {

    bodyEl.innerHTML = item.content.replace(/\n/g, '<br>');
    }
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

    const newsRef = collection(db, 'news');

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


    const injectRichTextStyles = () => {
    const style = document.createElement('style');
    style.textContent = `
    #modal-body a { color: #3b82f6; text-decoration: underline; transition: color 0.2s; }
    #modal-body a:hover { color: #2563eb; }
    #modal-body ul { list-style-type: disc; padding-left: 1.5rem; margin-bottom: 1rem; }
    #modal-body ol { list-style-type: decimal; padding-left: 1.5rem; margin-bottom: 1rem; }
    #modal-body strong, #modal-body b { font-weight: 700; color: inherit; }
    #modal-body em, #modal-body i { font-style: italic; }
    #modal-body p { margin-bottom: 1rem; line-height: 1.8; }
    #modal-body h2, #modal-body h3 { font-weight: bold; margin-top: 1.5rem; margin-bottom: 0.75rem; color: inherit; }
    #modal-body h2 { font-size: 1.25rem; }
    #modal-body h3 { font-size: 1.125rem; }
    `;
    document.head.appendChild(style);
    };
    injectRichTextStyles();


    fetchNews();
