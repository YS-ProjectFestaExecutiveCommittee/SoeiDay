import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { 
  getAuth, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, 
  getAdditionalUserInfo, deleteUser, onAuthStateChanged, signOut, linkWithPopup, unlink
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { 
  getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCDWj4xWfU42x2NG1tOSlXcBC-f2vhC3lA",
  authDomain: "soeiday.firebaseapp.com",
  projectId: "soeiday",
  storageBucket: "soeiday.firebasestorage.app",
  messagingSenderId: "122257503471",
  appId: "1:122257503471:web:8014972f2bc10f84ea971a"
};

let app, auth, db, quill;
let currentNewsData = [];
let unsubscribeNews = null;


try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (error) {
  console.error("Firebase initialization error:", error);
}


let els = {};

const hideLoading = () => {
  if (els.loading) {
    els.loading.classList.add('opacity-0');
    setTimeout(() => {
      els.loading.classList.add('hidden');
      els.loading.style.display = 'none'; 
    }, 300);
  }
};

const showLoading = () => {
  if (els.loading) {
    els.loading.style.display = 'flex';
    els.loading.classList.remove('hidden', 'opacity-0');
  }
};

const showLogin = () => {
  if (!els.login) return;
  
  els.dashboard.style.display = 'none';
  els.dashboard.classList.add('hidden');
  els.dashboard.classList.remove('block');
  
  els.headerUser.style.display = 'none';
  els.headerUser.classList.remove('flex');
  els.headerUser.classList.add('hidden');
  
  els.login.style.display = 'flex';
  els.login.classList.remove('hidden');
  
  if (unsubscribeNews) unsubscribeNews();
  document.getElementById('login-form').reset();
};

const showDashboard = (user) => {
  if (!els.dashboard) return;
  els.login.style.display = 'none';
  els.login.classList.add('hidden');
  
  els.dashboard.style.display = 'block';
  els.dashboard.classList.remove('hidden');
  
  els.headerUser.style.display = 'flex';
  els.headerUser.classList.remove('hidden');
  
  els.userDisplay.textContent = user.email;
  els.mypageEmail.textContent = user.email;
  checkLinkStatus(user);
  fetchNews();
};

document.addEventListener('DOMContentLoaded', () => {
  
  els = {
    loading: document.getElementById('loading-overlay'),
    login: document.getElementById('login-section'),
    dashboard: document.getElementById('dashboard-section'),
    headerUser: document.getElementById('header-user-info'),
    userDisplay: document.getElementById('current-user-display'),
    mypageEmail: document.getElementById('mypage-email')
  };
  
  
  const loadingTimeout = setTimeout(() => {
    console.warn("Loading timeout triggered. Forcing hide.");
    hideLoading();
    
    if (!auth || !auth.currentUser) {
      showLogin();
    }
  }, 5000);

  
  try {
    quill = new Quill('#quill-editor', {
      theme: 'snow',
      modules: {
        toolbar: [
          [{ 'header': [2, 3, false] }],
          ['bold', 'italic', 'underline', 'strike'],
          [{ 'color': [] }, { 'background': [] }],
          [{ 'list': 'ordered'}, { 'list': 'bullet' }],
          ['link', 'clean']
        ]
      }
    });
  } catch (error) {
    console.error("Quill initialization error:", error);
  }

  if (auth) {
    onAuthStateChanged(auth, (user) => {
      clearTimeout(loadingTimeout); 

      if (user) {
        
        const creationTime = new Date(user.metadata.creationTime).getTime();
        const lastSignInTime = new Date(user.metadata.lastSignInTime).getTime();
        if (Math.abs(lastSignInTime - creationTime) < 5000 && user.providerData.some(p => p.providerId === 'google.com')) {
          
          return;
        }
        
        hideLoading();
        showDashboard(user);
      } else {
        hideLoading();
        showLogin();
      }
    }, (error) => {
      console.error("Auth state change error:", error);
      clearTimeout(loadingTimeout);
      hideLoading();
      showLogin();
    });
  } else {
    clearTimeout(loadingTimeout);
    hideLoading();
    showLogin();
  }

  
  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    showLoading();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      
    } catch (error) {
      console.error("Login error:", error);
      hideLoading();
      alert("ログインに失敗しました。メールアドレスまたはパスワードが間違っています。");
    }
  });

  
  document.getElementById('google-login-btn').addEventListener('click', async () => {
    if (!auth) return;
    showLoading();
    
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ hd: 'soei.ed.jp' }); 
    
    try {
      const result = await signInWithPopup(auth, provider);
      const details = getAdditionalUserInfo(result);
      
      
      if (details.isNewUser) {
        await deleteUser(result.user);
        await signOut(auth);
        hideLoading();
        showLogin();
        alert("【エラー】新規アカウントの作成は許可されていません。\nまずは発行されたメールアドレスでログインし、マイページからGoogleアカウントを連携してください。");
      }
    } catch (error) {
      console.error("Google Login error:", error);
      hideLoading();
      if(error.code !== 'auth/popup-closed-by-user'){
         alert("Googleログインに失敗しました。\n未連携のアカウントの可能性があります。");
      }
    }
  });

  
  document.getElementById('logout-btn').addEventListener('click', () => {
    if(auth) {
      showLoading();
      signOut(auth).catch(e => {
        console.error(e);
        hideLoading();
      });
    }
  });

  
  const switchTab = (tabName) => {
    const tabs = { news: document.getElementById('tab-content-news'), mypage: document.getElementById('tab-content-mypage') };
    const btns = { news: document.getElementById('tab-btn-news'), mypage: document.getElementById('tab-btn-mypage') };
    
    Object.keys(tabs).forEach(key => {
      if (key === tabName) {
        tabs[key].classList.remove('hidden');
        tabs[key].classList.add('block');
        btns[key].className = "py-3 px-6 text-center font-medium border-b-2 border-slate-900 text-slate-900 transition bg-white/50";
      } else {
        tabs[key].classList.add('hidden');
        tabs[key].classList.remove('block');
        btns[key].className = "py-3 px-6 text-center font-medium border-b-2 border-transparent text-slate-500 hover:text-slate-700 transition";
      }
    });
  };
  
  document.getElementById('tab-btn-news').addEventListener('click', () => switchTab('news'));
  document.getElementById('tab-btn-mypage').addEventListener('click', () => switchTab('mypage'));

  
  document.getElementById('cancel-edit-btn').addEventListener('click', resetForm);

  
  document.getElementById('editor-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!db || !quill) return;
    
    const payload = {
      title: document.getElementById('news-title').value,
      date: document.getElementById('news-date').value,
      type: document.getElementById('news-category').value,
      content: quill.root.innerHTML,
      image: document.getElementById('news-image').value,
      video: document.getElementById('news-video').value
    };

    const id = document.getElementById('edit-id').value;
    const saveBtn = document.getElementById('save-btn');
    
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> <span>保存中...</span>';

    try {
      if (id) {
        await updateDoc(doc(db, 'news', id), payload);
        alert("更新しました。");
      } else {
        await addDoc(collection(db, 'news'), payload);
        alert("投稿しました。");
      }
      resetForm();
    } catch(e) {
      console.error("Save error:", e);
      alert("保存エラー: " + e.message);
    } finally {
      saveBtn.disabled = false;
      saveBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> <span>投稿する</span>';
    }
  });
});

const checkLinkStatus = (user) => {
  const isLinked = user.providerData.some(p => p.providerId === 'google.com');
  const statusEl = document.getElementById('link-status');
  const btn = document.getElementById('link-google-btn');
  
  if (isLinked) {
    statusEl.innerHTML = `<span class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 text-green-800 text-sm font-bold"><i class="fa-solid fa-check-circle"></i> 連携済み</span>`;
    btn.innerHTML = `<span>Googleアカウントの連携を解除</span>`;
    btn.onclick = async () => {
      if(confirm("Googleアカウントの連携を解除しますか？")) {
        try {
          await unlink(user, GoogleAuthProvider.PROVIDER_ID);
          alert("連携を解除しました。");
          checkLinkStatus(auth.currentUser);
        } catch(e) { 
          console.error("Unlink error:", e);
          alert("解除に失敗しました: " + e.message); 
        }
      }
    };
  } else {
    statusEl.innerHTML = `<span class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-200 text-gray-700 text-sm font-bold"><i class="fa-solid fa-circle-info"></i> 未連携</span>`;
    btn.innerHTML = `<img src="https://www.svgrepo.com/show/475656/google-color.svg" class="w-5 h-5"><span>Googleアカウントを連携する</span>`;
    btn.onclick = async () => {
      const provider = new GoogleAuthProvider();
      try {
        const result = await linkWithPopup(user, provider);
        if (!result.user.email.endsWith('@soei.ed.jp')) {
          await unlink(user, GoogleAuthProvider.PROVIDER_ID);
          alert("エラー: @soei.ed.jp ドメインのGoogleアカウントのみ連携可能です。");
          return;
        }
        alert("Googleアカウントの連携が完了しました。次回からGoogleでログイン可能です。");
        checkLinkStatus(auth.currentUser);
      } catch(e) {
         console.error("Link error:", e);
         if(e.code !== 'auth/popup-closed-by-user') alert("連携に失敗しました: " + e.message);
      }
    };
  }
};

const fetchNews = () => {
  if (!db) return;
  const newsRef = collection(db, 'news');
  unsubscribeNews = onSnapshot(newsRef, (snapshot) => {
    const data = [];
    snapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() }));
    data.sort((a, b) => new Date(b.date || '1970').getTime() - new Date(a.date || '1970').getTime());
    currentNewsData = data;
    renderList(data);
  }, (error) => {
    console.error("Fetch news error:", error);
    document.getElementById('news-list-table').innerHTML = `<tr><td colspan="4" class="p-8 text-center text-red-500">データ取得エラー: ${error.message}</td></tr>`;
  });
};

const renderList = (data) => {
  const tbody = document.getElementById('news-list-table');
  if (data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="p-8 text-center text-gray-500">記事がありません。</td></tr>';
    return;
  }

  tbody.innerHTML = data.map(item => `
    <tr class="hover:bg-slate-50 transition border-b border-gray-100">
      <td class="p-3 text-sm text-slate-600">${item.date || '----.--.--'}</td>
      <td class="p-3">
        <span class="px-2 py-1 text-xs rounded-sm ${item.type === 'topic' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'} tracking-wider">
          ${item.type === 'topic' ? 'トピック' : 'リリース'}
        </span>
      </td>
      <td class="p-3 font-medium text-slate-800">${item.title || '無題'}</td>
      <td class="p-3 text-center">
        <div class="flex justify-center gap-2">
          <button onclick="editDoc('${item.id}')" class="px-3 py-1 bg-white border border-gray-300 text-slate-600 hover:bg-gray-100 rounded text-sm transition shadow-sm">編集</button>
          <button onclick="deleteDocHandler('${item.id}')" class="px-3 py-1 bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 rounded text-sm transition shadow-sm">削除</button>
        </div>
      </td>
    </tr>
  `).join('');
};

const resetForm = () => {
  document.getElementById('editor-form').reset();
  document.getElementById('edit-id').value = '';
  if(quill) quill.root.innerHTML = '';
  document.getElementById('form-title').textContent = '新規お知らせ作成';
  document.getElementById('cancel-edit-btn').classList.add('hidden');
};


window.editDoc = (id) => {
  const item = currentNewsData.find(d => d.id === id);
  if(!item) return;

  document.getElementById('edit-id').value = item.id;
  document.getElementById('news-title').value = item.title || '';
  document.getElementById('news-date').value = item.date || '';
  document.getElementById('news-category').value = item.type || 'news';
  document.getElementById('news-image').value = item.image || '';
  document.getElementById('news-video').value = item.video || '';
  if(quill) quill.root.innerHTML = item.content || '';
  
  document.getElementById('form-title').textContent = 'お知らせの編集';
  document.getElementById('cancel-edit-btn').classList.remove('hidden');
  
  
  document.getElementById('form-title').scrollIntoView({ behavior: 'smooth', block: 'start' });
};

window.deleteDocHandler = async (id) => {
  if(confirm('本当にこの記事を削除しますか？')) {
    try {
      if(db) await deleteDoc(doc(db, 'news', id));
    } catch(e) { 
      console.error("Delete error:", e);
      alert("削除エラー: " + e.message); 
    }
  }
};
