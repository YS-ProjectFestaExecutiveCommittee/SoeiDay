import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
    import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
    import { getFirestore, collection, onSnapshot, addDoc, deleteDoc, doc, setDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

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

    
    let currentUser = null; 
    let adminUsers = [];    
    let newsData = [];      
    let currentAdminId = null; 
    let unsubs = [];        

    
    document.getElementById('news-date').valueAsDate = new Date();

    
    
    
    
    async function hashPassword(password) {
      const encoder = new TextEncoder();
      const data = encoder.encode(password);
      
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      return hashHex;
    }

    
    
    
    window.switchTab = function(tabName) {
      const newsContent = document.getElementById('tab-content-news');
      const usersContent = document.getElementById('tab-content-users');
      const newsBtn = document.getElementById('tab-btn-news');
      const usersBtn = document.getElementById('tab-btn-users');

      if (tabName === 'news') {
        newsContent.classList.remove('hidden');
        usersContent.classList.add('hidden');
        
        newsBtn.className = "py-3 px-6 text-center font-medium border-b-2 border-slate-900 text-slate-900 transition bg-white/50";
        usersBtn.className = "py-3 px-6 text-center font-medium border-b-2 border-transparent text-slate-500 hover:text-slate-700 transition";
      } else {
        newsContent.classList.add('hidden');
        usersContent.classList.remove('hidden');
        
        usersBtn.className = "py-3 px-6 text-center font-medium border-b-2 border-slate-900 text-slate-900 transition bg-white/50";
        newsBtn.className = "py-3 px-6 text-center font-medium border-b-2 border-transparent text-slate-500 hover:text-slate-700 transition";
      }
    };

    function showToast(message, type = 'success') {
      const container = document.getElementById('toast-container');
      const toast = document.createElement('div');
      
      const bgColor = type === 'success' ? 'bg-lime-600' : 'bg-red-600';
      const icon = type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle';
      
      toast.className = `toast-enter ${bgColor} text-white px-6 py-3 rounded shadow-lg flex items-center gap-3`;
      toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
      
      container.appendChild(toast);
      
      
      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        toast.style.transition = 'all 0.3s ease-out';
        setTimeout(() => toast.remove(), 300);
      }, 3000);
    }

    
    
    
    document.getElementById('news-image-input').addEventListener('change', function(e) {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = function(event) {
        const img = new Image();
        img.onload = function() {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX_SIZE = 500; 

          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          
          const base64String = canvas.toDataURL('image/jpeg', 0.8);
          
          document.getElementById('news-image-base64').value = base64String;
          document.getElementById('image-preview').src = base64String;
          document.getElementById('image-preview-container').classList.remove('hidden');
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    });

    window.clearImage = function() {
      document.getElementById('news-image-input').value = '';
      document.getElementById('news-image-base64').value = '';
      document.getElementById('image-preview').src = '';
      document.getElementById('image-preview-container').classList.add('hidden');
    };

    
    
    
    
    
    const fetchData = () => {
      if (!currentUser) return;
      
      
      unsubs.forEach(unsub => unsub());
      unsubs = [];

      
      const adminRef = collection(db, 'artifacts', appId, 'public', 'data', 'admin_users');
      const unsubAdmin = onSnapshot(adminRef, async (snapshot) => {
        adminUsers = [];
        snapshot.forEach(doc => {
          adminUsers.push({ id: doc.id, ...doc.data() });
        });

        
        if (adminUsers.length === 0) {
          const hashedPW = await hashPassword('soei2026');
          await setDoc(doc(adminRef, 'admin'), {
            passwordHash: hashedPW,
            createdAt: new Date().toISOString()
          });
          console.log("初期管理者アカウントを作成しました (ID: admin)");
        }

        renderUsersList();
      }, (error) => { console.error("Admin fetch error:", error); });
      
      unsubs.push(unsubAdmin);

      
      const newsRef = collection(db, 'artifacts', appId, 'public', 'data', 'school_news');
      const unsubNews = onSnapshot(newsRef, (snapshot) => {
        newsData = [];
        snapshot.forEach(doc => {
          newsData.push({ id: doc.id, ...doc.data() });
        });
        
        
        newsData.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
        renderNewsList();
        
        
        document.getElementById('loading-overlay').classList.add('hidden');
        
        
        checkSession();

      }, (error) => { console.error("News fetch error:", error); });

      unsubs.push(unsubNews);
    };

    
    function checkSession() {
      const savedAdmin = sessionStorage.getItem('soei_admin_id');
      if (savedAdmin) {
        
        const userExists = adminUsers.find(u => u.id === savedAdmin);
        if (userExists) {
          showDashboard(savedAdmin);
          return;
        }
      }
      
      document.getElementById('login-section').classList.remove('hidden');
      document.getElementById('dashboard-section').classList.add('hidden');
    }

    
    window.attemptLogin = async function() {
      const idInput = document.getElementById('login-id').value.trim();
      const pwInput = document.getElementById('login-password').value;
      const errorEl = document.getElementById('login-error');
      
      if (!idInput || !pwInput) {
        errorEl.textContent = "IDとパスワードを入力してください。";
        errorEl.classList.remove('hidden');
        return;
      }

      
      const hashedPW = await hashPassword(pwInput);
      const targetUser = adminUsers.find(u => u.id === idInput);

      if (targetUser && targetUser.passwordHash === hashedPW) {
        
        sessionStorage.setItem('soei_admin_id', idInput);
        errorEl.classList.add('hidden');
        document.getElementById('login-id').value = '';
        document.getElementById('login-password').value = '';
        showDashboard(idInput);
        showToast('ログインしました');
      } else {
        
        errorEl.textContent = "IDまたはパスワードが間違っています。";
        errorEl.classList.remove('hidden');
      }
    };

    window.logout = function() {
      sessionStorage.removeItem('soei_admin_id');
      currentAdminId = null;
      document.getElementById('login-section').classList.remove('hidden');
      document.getElementById('dashboard-section').classList.add('hidden');
      document.getElementById('header-user-info').classList.add('hidden');
      showToast('ログアウトしました');
    };

    function showDashboard(adminId) {
      currentAdminId = adminId;
      document.getElementById('login-section').classList.add('hidden');
      document.getElementById('dashboard-section').classList.remove('hidden');
      document.getElementById('current-user-display').textContent = adminId;
      document.getElementById('header-user-info').classList.remove('hidden');
    }

    
    
    
    window.submitNews = async function() {
      if (!currentUser) return;
      
      const title = document.getElementById('news-title').value.trim();
      const date = document.getElementById('news-date').value;
      const type = document.getElementById('news-category').value;
      const content = document.getElementById('news-content').value.trim();
      const image = document.getElementById('news-image-base64').value;
      const video = document.getElementById('news-video').value.trim();

      if (!title || !date || !content) {
        alert("タイトル、日付、本文は必須入力です。");
        return;
      }

      const newsRef = collection(db, 'artifacts', appId, 'public', 'data', 'school_news');
      
      try {
        await addDoc(newsRef, {
          title, date, type, content, image, video,
          createdAt: new Date().toISOString(),
          authorId: currentAdminId
        });
        
        showToast('お知らせを投稿しました');
        
        
        document.getElementById('news-title').value = '';
        document.getElementById('news-content').value = '';
        document.getElementById('news-video').value = '';
        clearImage();
        
      } catch(e) {
        console.error(e);
        showToast('エラーが発生しました', 'error');
      }
    };

    window.deleteNews = async function(id) {
      if (!currentUser) return;
      if (confirm("このお知らせを削除してもよろしいですか？\n※この操作は取り消せません。")) {
        try {
          await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'school_news', id));
          showToast('お知らせを削除しました');
        } catch(e) {
          console.error(e);
          showToast('削除に失敗しました', 'error');
        }
      }
    };

    function renderNewsList() {
      const tbody = document.getElementById('news-list-table');
      if (newsData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="p-4 text-center text-slate-400">投稿データがありません</td></tr>';
        return;
      }
      
      let html = '';
      newsData.forEach(item => {
        const catLabel = item.type === 'topic' ? '<span class="bg-lime-100 text-lime-800 px-2 py-1 rounded text-xs">トピック</span>' : '<span class="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">リリース</span>';
        html += `
          <tr class="border-b border-gray-100 hover:bg-slate-50 transition">
            <td class="p-3 whitespace-nowrap text-sm text-slate-500">${item.date}</td>
            <td class="p-3 whitespace-nowrap">${catLabel}</td>
            <td class="p-3 font-medium text-slate-900">${item.title}</td>
            <td class="p-3 text-center whitespace-nowrap">
              <button onclick="deleteNews('${item.id}')" class="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1 rounded transition text-sm">
                削除
              </button>
            </td>
          </tr>
        `;
      });
      tbody.innerHTML = html;
    }

    
    
    
    window.createUser = async function() {
      if (!currentUser) return;
      
      const newId = document.getElementById('new-user-id').value.trim();
      const newPw = document.getElementById('new-user-password').value;

      if (!newId || !newPw) {
        alert("IDとパスワードを入力してください。");
        return;
      }
      
      
      if (adminUsers.find(u => u.id === newId)) {
        alert("このIDはすでに使われています。");
        return;
      }

      try {
        const hashedPW = await hashPassword(newPw);
        const adminRef = collection(db, 'artifacts', appId, 'public', 'data', 'admin_users');
        
        
        await setDoc(doc(adminRef, newId), {
          passwordHash: hashedPW,
          createdAt: new Date().toISOString(),
          createdBy: currentAdminId
        });
        
        showToast(`ユーザー「${newId}」を追加しました`);
        
        document.getElementById('new-user-id').value = '';
        document.getElementById('new-user-password').value = '';
        
      } catch(e) {
        console.error(e);
        showToast('ユーザーの追加に失敗しました', 'error');
      }
    };

    window.deleteUser = async function(id) {
      if (!currentUser) return;
      
      
      if (adminUsers.length <= 1) {
        alert("最後のアカウントは削除できません。");
        return;
      }
      
      if (id === currentAdminId) {
        alert("現在ログイン中のアカウントは削除できません。");
        return;
      }

      if (confirm(`ユーザー「${id}」を削除してもよろしいですか？`)) {
        try {
          await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'admin_users', id));
          showToast('アカウントを削除しました');
        } catch(e) {
          console.error(e);
          showToast('削除に失敗しました', 'error');
        }
      }
    };

    function renderUsersList() {
      const tbody = document.getElementById('users-list-table');
      if (adminUsers.length === 0) return;
      
      let html = '';
      adminUsers.forEach(user => {
        const dateStr = user.createdAt ? new Date(user.createdAt).toLocaleDateString('ja-JP') : '-';
        const isMe = user.id === currentAdminId;
        
        html += `
          <tr class="border-b border-gray-100 hover:bg-slate-50 transition">
            <td class="p-3 font-medium text-slate-900">
              <i class="fa-solid fa-user-circle text-slate-400 mr-2"></i> ${user.id}
              ${isMe ? '<span class="ml-2 text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded">You</span>' : ''}
            </td>
            <td class="p-3 text-sm text-slate-500">${dateStr}</td>
            <td class="p-3 text-center whitespace-nowrap">
              ${!isMe ? `<button onclick="deleteUser('${user.id}')" class="text-slate-500 hover:text-red-600 bg-slate-100 hover:bg-red-50 px-3 py-1 rounded transition text-sm">削除</button>` : '<span class="text-xs text-slate-300">操作不可</span>'}
            </td>
          </tr>
        `;
      });
      tbody.innerHTML = html;
    }

    
    
    
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
      }
    };

    onAuthStateChanged(auth, (user) => {
      currentUser = user;
      if (user) {
        fetchData();
      }
    });

    initAuth();
