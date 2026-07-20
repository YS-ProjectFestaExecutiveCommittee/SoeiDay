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
    let allLocations = [];
    let allEvents = [];
    let allAdmins = [];

    

    
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
      ['events', 'locations', 'users'].forEach(id => {
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
      
      
      const sessionAdmin = sessionStorage.getItem('soeiAdminLogged');
      if (sessionAdmin) {
        loggedInAdmin = sessionAdmin;
        showDashboard();
      } else {
        showLogin();
      }
    });

    
    const checkAndCreateDefaultAdmin = async () => {
      const adminRef = collection(db, 'artifacts', appId, 'public', 'data', 'admin_users');
      const docs = await getDocs(adminRef);
      if (docs.empty) {
        const hashedPass = await hashPassword('admin');
        await setDoc(doc(adminRef, 'admin'), {
          id: 'admin',
          passHash: hashedPass,
          createdAt: new Date().toISOString()
        });
        console.log("初期アカウントを作成しました。 (ID: admin / Pass: admin)");
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
        const adminDoc = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'admin_users', id));
        if (adminDoc.exists()) {
          const hashedInput = await hashPassword(pass);
          if (adminDoc.data().passHash === hashedInput) {
            
            loggedInAdmin = id;
            sessionStorage.setItem('soeiAdminLogged', id);
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
      sessionStorage.removeItem('soeiAdminLogged');
      showToast('ログアウトしました', 'info');
      showLogin();
    };


    

    const setupListeners = () => {
      if (!currentUser) return;
      
      const locRef = collection(db, 'artifacts', appId, 'public', 'data', 'timetable_locations');
      const eventRef = collection(db, 'artifacts', appId, 'public', 'data', 'timetable_events');
      const adminRef = collection(db, 'artifacts', appId, 'public', 'data', 'admin_users');
      
      onSnapshot(locRef, (snapshot) => {
        allLocations = [];
        snapshot.forEach(doc => allLocations.push({ id: doc.id, ...doc.data() }));
        allLocations.sort((a, b) => (a.order || 0) - (b.order || 0));
        renderLocationList();
        updateLocationSelects();
      });
      
      onSnapshot(eventRef, (snapshot) => {
        allEvents = [];
        snapshot.forEach(doc => allEvents.push({ id: doc.id, ...doc.data() }));
        allEvents.sort((a, b) => {
          if (a.day !== b.day) return a.day - b.day;
          return a.startTime.localeCompare(b.startTime);
        });
        renderEventList();
      });

      onSnapshot(adminRef, (snapshot) => {
        allAdmins = [];
        snapshot.forEach(doc => allAdmins.push({ id: doc.id, ...doc.data() }));
        renderUserList();
      });
    };


    

    window.submitLocation = async () => {
      if (!currentUser) return;
      
      const idField = document.getElementById('loc-edit-id');
      const nameField = document.getElementById('loc-name');
      const orderField = document.getElementById('loc-order');
      
      const name = nameField.value.trim();
      const order = parseInt(orderField.value) || 1;
      
      if (!name) { showToast('場所の名前を入力してください', 'error'); return; }
      
      const locId = idField.value || `loc_${generateId()}`;
      
      try {
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'timetable_locations', locId), {
          name: name,
          order: order
        }, { merge: true });
        
        showToast(idField.value ? '場所を更新しました' : '新しい場所を追加しました');
        window.cancelLocEdit();
      } catch (error) {
        console.error(error);
        showToast('エラーが発生しました', 'error');
      }
    };

    window.editLocation = (id) => {
      const loc = allLocations.find(l => l.id === id);
      if (!loc) return;
      
      document.getElementById('loc-form-title').innerHTML = '<i class="fa-solid fa-pen"></i> 場所の編集';
      document.getElementById('loc-edit-id').value = loc.id;
      document.getElementById('loc-name').value = loc.name;
      document.getElementById('loc-order').value = loc.order;
      
      document.getElementById('btn-submit-loc').innerHTML = '<i class="fa-solid fa-floppy-disk"></i> 更新';
      document.getElementById('btn-cancel-loc').classList.remove('hidden');
      
      document.getElementById('loc-name').focus();
    };

    window.cancelLocEdit = () => {
      document.getElementById('loc-form-title').textContent = '新規場所の追加';
      document.getElementById('loc-edit-id').value = '';
      document.getElementById('loc-name').value = '';
      document.getElementById('loc-order').value = '1';
      document.getElementById('btn-submit-loc').innerHTML = '<i class="fa-solid fa-plus"></i> 追加';
      document.getElementById('btn-cancel-loc').classList.add('hidden');
    };

    const renderLocationList = () => {
      const tbody = document.getElementById('locations-list-table');
      if (allLocations.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="p-4 text-center text-slate-500">登録された場所はありません。</td></tr>';
        return;
      }
      
      let html = '';
      allLocations.forEach(loc => {
        html += `
          <tr class="hover:bg-slate-50 transition border-b border-gray-100">
            <td class="p-3 text-center num-font font-bold text-slate-600">${loc.order}</td>
            <td class="p-3 font-bold">${loc.name}</td>
            <td class="p-3 text-center space-x-2">
              <button onclick="window.editLocation('${loc.id}')" class="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition text-sm">編集</button>
              <button onclick="window.confirmDelete('location', '${loc.id}')" class="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition text-sm">削除</button>
            </td>
          </tr>
        `;
      });
      tbody.innerHTML = html;
    };

    const updateLocationSelects = () => {
      const select = document.getElementById('ev-location');
      const currentVal = select.value;
      
      if (allLocations.length === 0) {
        select.innerHTML = '<option value="">(場所を登録してください)</option>';
        return;
      }
      
      let html = '';
      allLocations.forEach(loc => {
        html += `<option value="${loc.id}">${loc.name}</option>`;
      });
      select.innerHTML = html;
      
      
      if (currentVal && allLocations.find(l => l.id === currentVal)) {
        select.value = currentVal;
      }
    };


    

    window.submitEvent = async () => {
      if (!currentUser) return;
      
      const id = document.getElementById('event-edit-id').value;
      const title = document.getElementById('ev-title').value.trim();
      const day = parseInt(document.getElementById('ev-day').value);
      const locationId = document.getElementById('ev-location').value;
      const startTime = document.getElementById('ev-start').value;
      const endTime = document.getElementById('ev-end').value;
      const groupName = document.getElementById('ev-group').value.trim();
      const color = document.getElementById('ev-color').value;
      const description = document.getElementById('ev-desc').value.trim();
      
      if (!title || !locationId || !startTime || !endTime) {
        showToast('必須項目を入力してください', 'error');
        return;
      }
      
      if (startTime >= endTime) {
        showToast('終了時間は開始時間より後に設定してください', 'error');
        return;
      }

      document.getElementById('event-form-overlay').classList.remove('hidden');
      
      const evId = id || `ev_${generateId()}`;
      
      try {
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'timetable_events', evId), {
          title, day, locationId, startTime, endTime, groupName, color, description,
          updatedAt: new Date().toISOString()
        }, { merge: true });
        
        showToast(id ? 'イベントを更新しました' : 'イベントを追加しました');
        window.cancelEventEdit();
      } catch (error) {
        console.error(error);
        showToast('エラーが発生しました', 'error');
      } finally {
        document.getElementById('event-form-overlay').classList.add('hidden');
      }
    };

    window.editEvent = (id) => {
      const ev = allEvents.find(e => e.id === id);
      if (!ev) return;
      
      document.getElementById('event-form-title').innerHTML = '<i class="fa-solid fa-pen"></i> イベントの編集';
      document.getElementById('event-edit-id').value = ev.id;
      
      document.getElementById('ev-title').value = ev.title || '';
      document.getElementById('ev-day').value = ev.day || 1;
      document.getElementById('ev-location').value = ev.locationId || '';
      document.getElementById('ev-start').value = ev.startTime || '09:30';
      document.getElementById('ev-end').value = ev.endTime || '10:00';
      document.getElementById('ev-group').value = ev.groupName || '';
      document.getElementById('ev-color').value = ev.color || 'bg-slate-700 text-white';
      document.getElementById('ev-desc').value = ev.description || '';
      
      document.getElementById('btn-submit-ev').innerHTML = '<i class="fa-solid fa-floppy-disk"></i> 更新する';
      document.getElementById('btn-cancel-ev').classList.remove('hidden');
      
      
      document.getElementById('tab-content-events').scrollIntoView({ behavior: 'smooth' });
    };

    window.cancelEventEdit = () => {
      document.getElementById('event-form-title').textContent = '新規イベント作成';
      document.getElementById('event-edit-id').value = '';
      
      document.getElementById('ev-title').value = '';
      document.getElementById('ev-day').value = '1';
      document.getElementById('ev-start').value = '09:30';
      document.getElementById('ev-end').value = '10:00';
      document.getElementById('ev-group').value = '';
      document.getElementById('ev-color').value = 'bg-slate-700 text-white';
      document.getElementById('ev-desc').value = '';
      
      document.getElementById('btn-submit-ev').innerHTML = '<i class="fa-solid fa-floppy-disk"></i> 保存';
      document.getElementById('btn-cancel-ev').classList.add('hidden');
    };

    window.renderEventList = () => {
      const filterDay = parseInt(document.getElementById('filter-day').value);
      const tbody = document.getElementById('events-list-table');
      
      let targetEvents = allEvents;
      if (filterDay > 0) {
        targetEvents = allEvents.filter(ev => ev.day === filterDay);
      }
      
      if (targetEvents.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-slate-500">登録されたイベントはありません。</td></tr>';
        return;
      }
      
      let html = '';
      targetEvents.forEach(ev => {
        const loc = allLocations.find(l => l.id === ev.locationId);
        const locName = loc ? loc.name : '<span class="text-red-500 text-xs">場所未定/削除済</span>';
        
        html += `
          <tr class="hover:bg-slate-50 transition border-b border-gray-100">
            <td class="p-3 text-sm num-font">第${ev.day}日目</td>
            <td class="p-3 text-sm num-font font-medium">${ev.startTime} - ${ev.endTime}</td>
            <td class="p-3 text-sm">${locName}</td>
            <td class="p-3">
              <div class="font-bold text-slate-800">${ev.title}</div>
              ${ev.groupName ? `<div class="text-xs text-slate-500 mt-1">${ev.groupName}</div>` : ''}
            </td>
            <td class="p-3 text-center space-x-2 whitespace-nowrap">
              <button onclick="window.editEvent('${ev.id}')" class="px-3 py-1 bg-lime-100 text-lime-700 rounded hover:bg-lime-200 transition text-sm">編集</button>
              <button onclick="window.confirmDelete('event', '${ev.id}')" class="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition text-sm">削除</button>
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
        const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'admin_users', id);
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
      
      if (type === 'location') msg.textContent = 'この場所を削除します。この場所に紐づくイベントは「場所未定」として表示されます。よろしいですか？';
      else if (type === 'event') msg.textContent = 'このイベントを削除します。よろしいですか？';
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
      if (type === 'location') colName = 'timetable_locations';
      else if (type === 'event') colName = 'timetable_events';
      else if (type === 'user') colName = 'admin_users';
      
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
