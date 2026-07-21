import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js';
    import { getAuth, signInAnonymously } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js';
    import { getFirestore, collection, doc, setDoc, deleteDoc, onSnapshot } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';

    
    const firebaseConfig = {
      apiKey: "AIzaSyCDWj4xWfU42x2NG1tOSlXcBC-f2vhC3lA",
      authDomain: "soeiday.firebaseapp.com",
      projectId: "soeiday",
      storageBucket: "soeiday.firebasestorage.app",
      messagingSenderId: "122257503471",
      appId: "1:122257503471:web:8014972f2bc10f84ea971a",
      measurementId: "G-EX7FJGF5R0"
    };

    const appId = 'soei-day-2026';
    let db;
    let auth;
    let localRoomsData = {};

    
    window.attemptLogin = async function() {
      const id = document.getElementById('login-id').value;
      const pass = document.getElementById('login-password').value;
      
      if (id && pass) {
        document.getElementById('login-error').classList.add('hidden');
        document.getElementById('loading-overlay').classList.remove('hidden');
        
        try {
          
          const app = initializeApp(firebaseConfig);
          auth = getAuth(app);
          db = getFirestore(app);
          
          await signInAnonymously(auth);
          
          
          document.getElementById('login-section').classList.add('hidden');
          document.getElementById('dashboard-section').classList.remove('hidden');
          document.getElementById('header-user-info').classList.remove('hidden');
          document.getElementById('current-user-display').textContent = id;
          
          startListeningToRooms();
        } catch (error) {
          console.error("Firebase Auth Error:", error);
          document.getElementById('loading-overlay').classList.add('hidden');
          showToast('データベースへの接続に失敗しました。', 'error');
        }
      } else {
        document.getElementById('login-error').classList.remove('hidden');
      }
    };

    window.logout = function() {
      if(confirm('ログアウトしますか？')) {
        location.reload();
      }
    };

    
    window.showToast = function(message, type = 'success') {
      const container = document.getElementById('toast-container');
      const toast = document.createElement('div');
      const bgColor = type === 'success' ? 'bg-lime-600' : 'bg-red-600';
      
      toast.className = `${bgColor} text-white px-5 py-3 rounded shadow-lg transition-all duration-300 opacity-0 transform translate-y-2 text-sm font-medium flex items-center gap-2`;
      toast.innerHTML = `<i class="fa-solid ${type === 'success' ? 'fa-check-circle' : 'fa-triangle-exclamation'}"></i> ${message}`;
      
      container.appendChild(toast);
      
      
      setTimeout(() => {
        toast.classList.remove('opacity-0', 'translate-y-2');
      }, 10);
      
      
      setTimeout(() => {
        toast.classList.add('opacity-0');
        setTimeout(() => toast.remove(), 300);
      }, 3000);
    };

    
    function startListeningToRooms() {
      const roomsRef = collection(db, 'artifacts', appId, 'public', 'data', 'map_rooms');
      
      onSnapshot(roomsRef, (snapshot) => {
        localRoomsData = {};
        snapshot.forEach((doc) => {
          localRoomsData[doc.id] = doc.data();
        });
        
        renderRoomsTable();
        document.getElementById('loading-overlay').classList.add('hidden');
      }, (error) => {
        console.error("Error fetching data:", error);
        document.getElementById('loading-overlay').classList.add('hidden');
        showToast('データの取得に失敗しました。', 'error');
      });
    }

    
    function renderRoomsTable() {
      const tbody = document.getElementById('rooms-list-table');
      const entries = Object.entries(localRoomsData);
      
      if (entries.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="p-8 text-center text-slate-400">登録されている部屋データはありません。</td></tr>';
        return;
      }

      
      const floorNames = {
        'h1': '本館1F', 'h2': '本館2F', 'h3': '本館3F/新館B1F',
        's1': '本館4F/新館1F', 's2': '新館2F', 's3': '新館3F'
      };
      
      const categoryNames = {
        'food': '<span class="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">模擬店</span>',
        'exhibition': '<span class="text-xs bg-lime-100 text-lime-700 px-2 py-1 rounded">展示</span>',
        'stage': '<span class="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">ステージ</span>',
        'other': '<span class="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded">その他</span>'
      };

      tbody.innerHTML = entries.map(([id, room]) => `
        <tr class="hover:bg-slate-50 transition border-b border-gray-100 group">
          <td class="p-3 font-mono text-xs text-slate-600">${id}</td>
          <td class="p-3 text-xs text-slate-600">${floorNames[room.floor] || room.floor}</td>
          <td class="p-3">
            <div class="font-bold text-slate-800 text-sm">${room.title || '（未設定）'}</div>
            <div class="text-xs text-slate-400">${room.roomName || ''}</div>
          </td>
          <td class="p-3">${categoryNames[room.category] || categoryNames['other']}</td>
          <td class="p-3 text-center">
            <button onclick="editRoom('${id}')" class="text-blue-500 hover:text-blue-700 mx-1 p-1" title="編集">
              <i class="fa-solid fa-pen-to-square"></i>
            </button>
            <button onclick="deleteRoom('${id}')" class="text-red-400 hover:text-red-600 mx-1 p-1" title="削除">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </td>
        </tr>
      `).join('');
    }

    
    window.resetForm = function() {
      document.getElementById('room-id').value = '';
      document.getElementById('room-id').readOnly = false;
      document.getElementById('room-id').classList.remove('bg-gray-100');
      document.getElementById('room-floor').value = 'h1';
      document.getElementById('room-name').value = '';
      document.getElementById('room-title').value = '';
      document.getElementById('room-category').value = 'food';
      document.getElementById('room-desc').value = '';
      document.getElementById('room-tags').value = '';
      document.getElementById('room-posx').value = '';
      document.getElementById('room-posy').value = '';
      
      document.getElementById('form-title').innerHTML = '部屋情報の新規登録';
    };

    
    window.editRoom = function(id) {
      const room = localRoomsData[id];
      if (!room) return;

      document.getElementById('room-id').value = id;
      document.getElementById('room-id').readOnly = true;
      document.getElementById('room-id').classList.add('bg-gray-100');
      
      document.getElementById('room-floor').value = room.floor || 'h1';
      document.getElementById('room-name').value = room.roomName || '';
      document.getElementById('room-title').value = room.title || '';
      document.getElementById('room-category').value = room.category || 'food';
      document.getElementById('room-desc').value = room.description || '';
      document.getElementById('room-tags').value = (room.tags || []).join(', ');
      document.getElementById('room-posx').value = room.posX || '';
      document.getElementById('room-posy').value = room.posY || '';
      
      document.getElementById('form-title').innerHTML = '部屋情報の編集 <span class="text-sm font-normal text-slate-500 ml-2">編集中...</span>';
      
      
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    
    window.saveRoom = async function() {
      const id = document.getElementById('room-id').value.trim();
      const title = document.getElementById('room-title').value.trim();
      
      if (!id) {
        alert('部屋IDは必須です。');
        return;
      }
      if (!title) {
        alert('企画タイトルは必須です。');
        return;
      }

      const tagsRaw = document.getElementById('room-tags').value;
      const tagsArray = tagsRaw.split(',').map(t => t.trim()).filter(t => t.length > 0);

      const roomData = {
        floor: document.getElementById('room-floor').value,
        roomName: document.getElementById('room-name').value.trim(),
        title: title,
        category: document.getElementById('room-category').value,
        description: document.getElementById('room-desc').value.trim(),
        tags: tagsArray,
        posX: document.getElementById('room-posx').value.trim(),
        posY: document.getElementById('room-posy').value.trim(),
        updatedAt: new Date().toISOString()
      };

      try {
        
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'map_rooms', id), roomData);
        showToast('保存しました。', 'success');
        resetForm();
      } catch (error) {
        console.error("Error saving document: ", error);
        showToast('保存に失敗しました。', 'error');
      }
    };

    
    window.deleteRoom = async function(id) {
      if (confirm(`部屋情報 [${id}] を完全に削除しますか？\nこの操作は元に戻せません。`)) {
        try {
          await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'map_rooms', id));
          showToast('削除しました。', 'success');
          
          if (document.getElementById('room-id').value === id) {
            resetForm();
          }
        } catch (error) {
          console.error("Error removing document: ", error);
          showToast('削除に失敗しました。', 'error');
        }
      }
    };
