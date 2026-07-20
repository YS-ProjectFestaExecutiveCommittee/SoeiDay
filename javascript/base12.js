import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
    import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
    import { getFirestore, collection, getDocs, onSnapshot, setDoc, doc, deleteDoc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

    
    const defaultFirebaseConfig = {
      apiKey: "AIzaSyCDWj4xWfU42x2NG1tOSlXcBC-f2vhC3lA",
      authDomain: "soeiday.firebaseapp.com",
      projectId: "soeiday",
      storageBucket: "soeiday.firebasestorage.app",
      messagingSenderId: "122257503471",
      appId: "1:122257503471:web:8014972f2bc10f84ea971a",
      measurementId: "G-EX7FJGF5R0"
    };

    const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : defaultFirebaseConfig;
    const app_id_str = "1:122257503471:web:8014972f2bc10f84ea971a";
    const appId = typeof __app_id !== 'undefined' ? __app_id : app_id_str;
    
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);

    
    let currentUser = null;
    let loggedInAdmin = null;
    let allBooths = [];
    let allAdmins = [];

    
    const categoryOrder = ["新館3階", "新館2階", "新館1階", "本館4階", "本館3階", "その他"];

    

    
    const hashPassword = async (password) => {
      const msgBuffer = new TextEncoder().encode(password);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    };

    
    window.showToast = (message, type = 'success') => {
      const container = document.getElementById('toast-container');
      const toast = document.createElement('div');
      
      const bgColors = {
        success: 'bg-slate-800 text-white border-l-4 border-lime-500',
        error: 'bg-red-600 text-white border-l-4 border-red-900',
        info: 'bg-blue-600 text-white border-l-4 border-blue-900'
      };
      const icons = {
        success: 'fa-check-circle text-lime-400',
        error: 'fa-triangle-exclamation text-red-200',
        info: 'fa-circle-info text-blue-200'
      };

      toast.className = `${bgColors[type]} px-6 py-3 shadow-lg flex items-center gap-3 fade-in rounded-sm pointer-events-auto`;
      toast.innerHTML = `<i class="fa-solid ${icons[type]}"></i> <span>${message}</span>`;
      
      container.appendChild(toast);
      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s ease';
        setTimeout(() => toast.remove(), 300);
      }, 3000);
    };

    const generateId = () => Math.random().toString(36).substring(2, 9);
    const formatDate = (dateString) => {
      if(!dateString) return '-';
      const d = new Date(dateString);
      return `${d.getFullYear()}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getDate().toString().padStart(2,'0')}`;
    };

    window.switchTab = (tabId) => {
      ['booths', 'users'].forEach(id => {
        document.getElementById(`tab-btn-${id}`).classList.remove('border-slate-900', 'text-slate-900', 'bg-white/50');
        document.getElementById(`tab-btn-${id}`).classList.add('border-transparent', 'text-slate-500');
        document.getElementById(`tab-content-${id}`).classList.add('hidden');
      });
      document.getElementById(`tab-btn-${tabId}`).classList.remove('border-transparent', 'text-slate-500');
      document.getElementById(`tab-btn-${tabId}`).classList.add('border-slate-900', 'text-slate-900', 'bg-white/50');
      document.getElementById(`tab-content-${tabId}`).classList.remove('hidden');
    };

    

    const initSystem = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          try { await signInWithCustomToken(auth, __initial_auth_token); } 
          catch (e) { await signInAnonymously(auth); }
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Auth init failed:", error);
        document.getElementById('loading-overlay').innerHTML = '<div class="text-red-500 bg-white p-4 rounded shadow">データベース接続エラー</div>';
      }
    };

    onAuthStateChanged(auth, async (user) => {
      currentUser = user;
      if (!user) return;
      
      await checkAndCreateDefaultAdmin();
      
      const sessionAdmin = sessionStorage.getItem('soeiBoothAdminLogged');
      if (sessionAdmin) {
        loggedInAdmin = sessionAdmin;
        showDashboard();
      } else {
        showLogin();
      }
    });

    const checkAndCreateDefaultAdmin = async () => {
      const adminRef = collection(db, 'artifacts', appId, 'public', 'data', 'booth_admin_users');
      const docs = await getDocs(adminRef);
      if (docs.empty) {
        const hashedPass = await hashPassword('admin');
        await setDoc(doc(adminRef, 'admin'), {
          id: 'admin',
          passHash: hashedPass,
          createdAt: new Date().toISOString()
        });
      }
    };

    const showLogin = () => {
      document.getElementById('loading-overlay').classList.add('hidden');
      document.getElementById('dashboard-section').classList.add('hidden');
      document.getElementById('header-user-info').classList.add('hidden');
      document.getElementById('login-section').classList.remove('hidden');
    };

    const showDashboard = () => {
      document.getElementById('loading-overlay').classList.add('hidden');
      document.getElementById('login-section').classList.add('hidden');
      document.getElementById('dashboard-section').classList.remove('hidden');
      document.getElementById('header-user-info').classList.remove('hidden');
      document.getElementById('current-user-display').textContent = loggedInAdmin;
      
      setupListeners();
    };

    window.attemptLogin = async () => {
      const id = document.getElementById('login-id').value.trim();
      const pass = document.getElementById('login-password').value;
      const errorDiv = document.getElementById('login-error');
      
      if (!id || !pass) {
        errorDiv.textContent = 'IDとパスワードを入力してください';
        errorDiv.classList.remove('hidden');
        return;
      }
      
      try {
        const adminDoc = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'booth_admin_users', id));
        if (adminDoc.exists()) {
          const hashedInput = await hashPassword(pass);
          if (adminDoc.data().passHash === hashedInput) {
            loggedInAdmin = id;
            sessionStorage.setItem('soeiBoothAdminLogged', id);
            errorDiv.classList.add('hidden');
            document.getElementById('login-id').value = '';
            document.getElementById('login-password').value = '';
            showDashboard();
            showToast('ログインしました');
            return;
          }
        }
        errorDiv.textContent = 'IDまたはパスワードが間違っています。';
        errorDiv.classList.remove('hidden');
      } catch (error) {
        console.error("Login error:", error);
        errorDiv.textContent = '通信エラーが発生しました。';
        errorDiv.classList.remove('hidden');
      }
    };

    window.logout = () => {
      loggedInAdmin = null;
      sessionStorage.removeItem('soeiBoothAdminLogged');
      showToast('ログアウトしました', 'info');
      showLogin();
    };

    

    const setupListeners = () => {
      if (!currentUser) return;
      
      const boothRef = collection(db, 'artifacts', appId, 'public', 'data', 'school_booths');
      const adminRef = collection(db, 'artifacts', appId, 'public', 'data', 'booth_admin_users');
      
      onSnapshot(boothRef, (snapshot) => {
        allBooths = [];
        snapshot.forEach(doc => allBooths.push({ id: doc.id, ...doc.data() }));
        
        
        allBooths.sort((a, b) => {
          const idxA = categoryOrder.indexOf(a.category);
          const idxB = categoryOrder.indexOf(b.category);
          const catA = idxA === -1 ? 99 : idxA;
          const catB = idxB === -1 ? 99 : idxB;
          if (catA !== catB) return catA - catB;
          return (a.name || '').localeCompare(b.name || '');
        });
        
        renderBoothList();
      });

      onSnapshot(adminRef, (snapshot) => {
        allAdmins = [];
        snapshot.forEach(doc => allAdmins.push({ id: doc.id, ...doc.data() }));
        renderUserList();
      });
    };

    
    
    window.handleImageUpload = (event) => {
      const file = event.target.files[0];
      if (!file) return;

      if (!file.type.match('image.*')) {
        showToast('画像ファイルを選択してください', 'error');
        event.target.value = '';
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          
          const MAX_SIZE = 600;
          let width = img.width;
          let height = img.height;

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

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          
          document.getElementById('b-image-base64').value = dataUrl;
          document.getElementById('image-preview').src = dataUrl;
          document.getElementById('image-preview-container').classList.remove('hidden');
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    };

    window.clearImage = () => {
      document.getElementById('b-image-input').value = '';
      document.getElementById('b-image-base64').value = '';
      document.getElementById('image-preview').src = '';
      document.getElementById('image-preview-container').classList.add('hidden');
    };

    

    window.submitBooth = async () => {
      if (!currentUser) return;
      
      const id = document.getElementById('edit-id').value;
      const name = document.getElementById('b-name').value.trim();
      const group = document.getElementById('b-group').value.trim();
      const category = document.getElementById('b-category').value;
      const room = document.getElementById('b-room').value.trim();
      const description = document.getElementById('b-desc').value.trim();
      const imageBase64 = document.getElementById('b-image-base64').value;
      
      if (!name || !group || !category) {
        showToast('必須項目（店舗名、団体名、エリア）を入力してください', 'error');
        return;
      }

      document.getElementById('form-overlay').classList.remove('hidden');
      const bId = id || `b_${generateId()}`;
      
      try {
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'school_booths', bId), {
          name, group, category, room, description, imageBase64,
          updatedAt: new Date().toISOString()
        }, { merge: true });
        
        showToast(id ? '店舗情報を更新しました' : '新しく店舗を登録しました');
        window.cancelEdit();
      } catch (error) {
        console.error(error);
        showToast('エラーが発生しました', 'error');
      } finally {
        document.getElementById('form-overlay').classList.add('hidden');
      }
    };

    window.editBooth = (id) => {
      const booth = allBooths.find(b => b.id === id);
      if (!booth) return;
      
      document.getElementById('form-title').innerHTML = '<i class="fa-solid fa-pen"></i> 出店情報の編集';
      document.getElementById('edit-id').value = booth.id;
      
      document.getElementById('b-name').value = booth.name || '';
      document.getElementById('b-group').value = booth.group || '';
      document.getElementById('b-category').value = booth.category || 'その他';
      document.getElementById('b-room').value = booth.room || '';
      document.getElementById('b-desc').value = booth.description || '';
      
      if (booth.imageBase64) {
        document.getElementById('b-image-base64').value = booth.imageBase64;
        document.getElementById('image-preview').src = booth.imageBase64;
        document.getElementById('image-preview-container').classList.remove('hidden');
      } else {
        window.clearImage();
      }
      
      document.getElementById('btn-submit').innerHTML = '<i class="fa-solid fa-floppy-disk"></i> 更新する';
      document.getElementById('btn-cancel').classList.remove('hidden');
      
      document.getElementById('tab-content-booths').scrollIntoView({ behavior: 'smooth' });
    };

    window.cancelEdit = () => {
      document.getElementById('form-title').textContent = '新規出店情報を作成';
      document.getElementById('edit-id').value = '';
      
      document.getElementById('b-name').value = '';
      document.getElementById('b-group').value = '';
      document.getElementById('b-category').value = '新館3階';
      document.getElementById('b-room').value = '';
      document.getElementById('b-desc').value = '';
      window.clearImage();
      
      document.getElementById('btn-submit').innerHTML = '<i class="fa-solid fa-floppy-disk"></i> 保存する';
      document.getElementById('btn-cancel').classList.add('hidden');
    };

    const renderBoothList = () => {
      const tbody = document.getElementById('booths-list-table');
      
      if (allBooths.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="p-4 text-center text-slate-500">登録された店舗はありません。</td></tr>';
        return;
      }
      
      let html = '';
      allBooths.forEach(booth => {
        const imgSrc = booth.imageBase64 || 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=150&q=80';
        
        html += `
          <tr class="hover:bg-slate-50 transition border-b border-gray-100">
            <td class="p-3">
              <div class="w-16 h-12 bg-gray-200 rounded overflow-hidden mx-auto">
                <img src="${imgSrc}" class="w-full h-full object-cover" alt="サムネイル">
              </div>
            </td>
            <td class="p-3">
              <div class="text-sm font-bold text-slate-700">${booth.category}</div>
              <div class="text-xs text-slate-500 mt-1">${booth.room || '場所未定'}</div>
            </td>
            <td class="p-3">
              <div class="font-bold text-slate-800">${booth.name}</div>
              <div class="text-xs text-slate-500 mt-1">${booth.group}</div>
            </td>
            <td class="p-3 text-center space-x-2 whitespace-nowrap">
              <button onclick="window.editBooth('${booth.id}')" class="px-3 py-1 bg-lime-100 text-lime-700 rounded hover:bg-lime-200 transition text-sm">編集</button>
              <button onclick="window.confirmDelete('booth', '${booth.id}')" class="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition text-sm">削除</button>
            </td>
          </tr>
        `;
      });
      tbody.innerHTML = html;
    };


    

    window.createUser = async () => {
      if (!currentUser) return;
      
      const idField = document.getElementById('new-user-id');
      const passField = document.getElementById('new-user-password');
      
      const id = idField.value.trim();
      const pass = passField.value;
      
      if (!id || !pass) {
        showToast('IDとパスワード両方を入力してください', 'error');
        return;
      }
      
      if (id.includes(' ') || id.includes('/')) {
        showToast('IDに空白や記号(/)は使用できません', 'error');
        return;
      }

      try {
        const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'booth_admin_users', id);
        const exists = (await getDoc(docRef)).exists();
        if (exists) {
          showToast('そのIDは既に使われています', 'error');
          return;
        }
        
        const hashedPass = await hashPassword(pass);
        await setDoc(docRef, {
          id: id,
          passHash: hashedPass,
          createdAt: new Date().toISOString()
        });
        
        showToast('新しいアカウントを作成しました');
        idField.value = '';
        passField.value = '';
      } catch (error) {
        console.error(error);
        showToast('アカウント作成に失敗しました', 'error');
      }
    };

    const renderUserList = () => {
      const tbody = document.getElementById('users-list-table');
      if (allAdmins.length === 0) return;
      
      let html = '';
      allAdmins.forEach(admin => {
        const isCurrent = admin.id === loggedInAdmin;
        const dateStr = formatDate(admin.createdAt);
        
        html += `
          <tr class="hover:bg-slate-50 transition border-b border-gray-100">
            <td class="p-3 font-bold font-sans">
              ${admin.id}
              ${isCurrent ? '<span class="ml-2 text-[10px] bg-lime-100 text-lime-700 px-2 py-0.5 rounded">ログイン中</span>' : ''}
              ${admin.id === 'admin' ? '<span class="ml-2 text-[10px] bg-gray-200 text-gray-700 px-2 py-0.5 rounded">初期アカウント</span>' : ''}
            </td>
            <td class="p-3 text-sm text-slate-500 num-font">${dateStr}</td>
            <td class="p-3 text-center">
              ${!isCurrent && admin.id !== 'admin' ? 
                `<button onclick="window.confirmDelete('user', '${admin.id}')" class="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition text-sm">削除</button>` 
                : '<span class="text-xs text-gray-400">削除不可</span>'}
            </td>
          </tr>
        `;
      });
      tbody.innerHTML = html;
    };


    

    let deleteTarget = { type: null, id: null };

    window.confirmDelete = (type, id) => {
      deleteTarget = { type, id };
      const modal = document.getElementById('confirm-modal');
      const msg = document.getElementById('confirm-msg');
      
      if (type === 'booth') msg.textContent = 'この店舗情報を削除します。よろしいですか？';
      else if (type === 'user') msg.textContent = `アカウント「${id}」を削除します。よろしいですか？`;
      
      modal.classList.remove('hidden');
    };

    window.closeConfirmModal = () => {
      document.getElementById('confirm-modal').classList.add('hidden');
      deleteTarget = { type: null, id: null };
    };

    document.getElementById('confirm-btn-exec').addEventListener('click', async () => {
      if (!currentUser || !deleteTarget.id) return;
      
      const { type, id } = deleteTarget;
      let colName = '';
      if (type === 'booth') colName = 'school_booths';
      else if (type === 'user') colName = 'booth_admin_users';
      
      try {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', colName, id));
        showToast('削除しました');
      } catch (error) {
        console.error(error);
        showToast('削除に失敗しました', 'error');
      } finally {
        window.closeConfirmModal();
      }
    });

    
    initSystem();
