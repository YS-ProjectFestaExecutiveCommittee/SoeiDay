import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js';
    import { getAuth, signInAnonymously } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js';
    import { getFirestore, collection, doc, setDoc, getDoc, deleteDoc, onSnapshot } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';

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
    let localUsersData = {};
    let currentFloor = 'h1';

    const floorTitles = {
      'h1': '本館 1F フロアマップ',
      'h2': '本館 2F フロアマップ',
      'h3': '本館 3F / 新館 B1F フロアマップ',
      's1': '本館 4F / 新館 1F / 体育館',
      's2': '新館 2F フロアマップ',
      's3': '新館 3F フロアマップ'
    };

    
    window.switchTab = function(tabName) {
      const mapContent = document.getElementById('tab-content-map');
      const usersContent = document.getElementById('tab-content-users');
      const mapBtn = document.getElementById('tab-btn-map');
      const usersBtn = document.getElementById('tab-btn-users');

      if (tabName === 'map') {
        mapContent.classList.remove('hidden');
        usersContent.classList.add('hidden');
        mapBtn.className = "py-3 px-6 text-center font-medium border-b-2 border-slate-900 text-slate-900 bg-white/50 transition";
        usersBtn.className = "py-3 px-6 text-center font-medium border-b-2 border-transparent text-slate-500 hover:text-slate-700 transition";
      } else {
        mapContent.classList.add('hidden');
        usersContent.classList.remove('hidden');
        usersBtn.className = "py-3 px-6 text-center font-medium border-b-2 border-slate-900 text-slate-900 bg-white/50 transition";
        mapBtn.className = "py-3 px-6 text-center font-medium border-b-2 border-transparent text-slate-500 hover:text-slate-700 transition";
      }
    };

    
    window.attemptLogin = async function() {
      const id = document.getElementById('login-id').value.trim();
      const pass = document.getElementById('login-password').value;
      const errorEl = document.getElementById('login-error');
      
      if (!id || !pass) {
        errorEl.classList.remove('hidden');
        errorEl.textContent = 'IDとパスワードを入力してください。';
        return;
      }

      errorEl.classList.add('hidden');
      document.getElementById('loading-overlay').classList.remove('hidden');
      
      try {
        const app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);
        
        
        await signInAnonymously(auth);
        
        let loginSuccess = false;

        
        if (id === 'admin' && pass === 'soei2026') {
          loginSuccess = true;
        } else {
          
          const userDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'admin_users', id);
          const userSnap = await getDoc(userDocRef);
          if (userSnap.exists() && userSnap.data().password === pass) {
            loginSuccess = true;
          }
        }

        if (loginSuccess) {
          document.getElementById('login-section').classList.add('hidden');
          document.getElementById('dashboard-section').classList.remove('hidden');
          document.getElementById('header-user-info').classList.remove('hidden');
          document.getElementById('current-user-display').textContent = id;
          
          startListeningToRooms();
          startListeningToUsers();
          window.switchFloor('h1');
          window.resetForm();
        } else {
          errorEl.classList.remove('hidden');
          errorEl.textContent = 'IDまたはパスワードが間違っています。';
        }
      } catch (error) {
        console.error("Auth/DB Error:", error);
        errorEl.classList.remove('hidden');
        errorEl.textContent = 'データベース接続に失敗しました。';
      } finally {
        document.getElementById('loading-overlay').classList.add('hidden');
      }
    };

    window.logout = function() {
      if(confirm('ログアウトしますか？')) location.reload();
    };

    window.showToast = function(message, type = 'success') {
      const container = document.getElementById('toast-container');
      const toast = document.createElement('div');
      const bgColor = type === 'success' ? 'bg-lime-600' : 'bg-red-600';
      toast.className = `${bgColor} text-white px-5 py-3 rounded shadow-lg transition-all duration-300 opacity-0 transform translate-y-2 text-sm font-medium flex items-center gap-2 pointer-events-auto`;
      toast.innerHTML = `<i class="fa-solid ${type === 'success' ? 'fa-check-circle' : 'fa-triangle-exclamation'}"></i> ${message}`;
      container.appendChild(toast);
      setTimeout(() => toast.classList.remove('opacity-0', 'translate-y-2'), 10);
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
        renderPins(currentFloor);
      }, (error) => console.error("Map Data fetch error:", error));
    }

    function startListeningToUsers() {
      const usersRef = collection(db, 'artifacts', appId, 'public', 'data', 'admin_users');
      onSnapshot(usersRef, (snapshot) => {
        localUsersData = {};
        snapshot.forEach((doc) => {
          localUsersData[doc.id] = doc.data();
        });
        renderUsersTable();
      }, (error) => console.error("Users Data fetch error:", error));
    }

    
    window.createUser = async function() {
      const id = document.getElementById('new-user-id').value.trim();
      const pass = document.getElementById('new-user-password').value;
      
      if (!id || !pass) { showToast('IDとパスワードを入力してください', 'error'); return; }
      if (id === 'admin') { showToast('admin は予約されたマスターIDです', 'error'); return; }
      if (id.length < 4 || pass.length < 6) { showToast('IDは4文字以上、パスワードは6文字以上にしてください', 'error'); return; }

      try {
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'admin_users', id), {
          password: pass, 
          createdAt: new Date().toISOString()
        });
        showToast('アカウントを作成しました', 'success');
        document.getElementById('new-user-id').value = '';
        document.getElementById('new-user-password').value = '';
      } catch (error) {
        console.error("Create User Error:", error);
        showToast('アカウント作成に失敗しました', 'error');
      }
    };

    window.deleteUser = async function(id) {
      if (id === 'admin') { showToast('マスターアカウントは削除できません', 'error'); return; }
      if (confirm(`アカウント [${id}] を削除しますか？\nこの操作は元に戻せません。`)) {
        try {
          await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'admin_users', id));
          showToast('アカウントを削除しました', 'success');
        } catch (error) {
          console.error("Delete User Error:", error);
          showToast('削除に失敗しました', 'error');
        }
      }
    };

    function renderUsersTable() {
      const tbody = document.getElementById('users-list-table');
      const entries = Object.entries(localUsersData);
      
      let html = `
        <tr class="hover:bg-slate-50 border-b border-gray-100">
          <td class="p-3 font-mono text-sm text-slate-700">admin <span class="text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded ml-2">マスター</span></td>
          <td class="p-3 text-sm text-slate-500">初期登録</td>
          <td class="p-3 text-center text-xs text-slate-400">削除不可</td>
        </tr>
      `;

      if (entries.length > 0) {
        html += entries.map(([id, user]) => {
          const date = user.createdAt ? new Date(user.createdAt).toLocaleDateString('ja-JP') : '不明';
          return `
            <tr class="hover:bg-slate-50 border-b border-gray-100">
              <td class="p-3 font-mono text-sm text-slate-700">${id}</td>
              <td class="p-3 text-sm text-slate-500">${date}</td>
              <td class="p-3 text-center">
                <button onclick="deleteUser('${id}')" class="text-red-400 hover:text-red-600 p-2"><i class="fa-solid fa-trash"></i></button>
              </td>
            </tr>
          `;
        }).join('');
      }
      tbody.innerHTML = html;
    }

    
    window.switchFloor = function(floorKey) {
      currentFloor = floorKey;
      document.getElementById('room-floor').value = floorKey;
      
      document.querySelectorAll('.floor-btn').forEach(btn => {
        btn.classList.remove('active-floor', 'bg-slate-900', 'text-white', 'border-transparent');
        btn.classList.add('border-gray-300', 'text-slate-700');
      });
      const activeBtn = document.getElementById(`btn-${floorKey}`);
      if (activeBtn) {
        activeBtn.classList.remove('border-gray-300', 'text-slate-700');
        activeBtn.classList.add('active-floor', 'bg-slate-900', 'text-white', 'border-transparent');
      }
      document.getElementById('current-floor-title').innerHTML = `<i class="fa-solid fa-map text-orange-500"></i> <span>${floorTitles[floorKey]}</span>`;

      if(!document.getElementById('form-title').innerHTML.includes('編集中')) {
          resetForm();
      }
      
      fetchMapDataAndRender(floorKey);
    };

    async function fetchMapDataAndRender(floorKey) {
      const blueprintBox = document.getElementById('blueprint-render-target');
      blueprintBox.innerHTML = `<div class="w-full h-full flex items-center justify-center text-slate-400 text-sm"><i class="fa-solid fa-spinner fa-spin mr-2"></i> マップデータを読み込んでいます...</div>`;
      
      try {
        const url = `https://ys-projectfestaexecutivecommittee.github.io/SoeiDay/blueprint/${floorKey}.js`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Fetch failed');
        const text = await response.text();
        const func = new Function(`var mapData; ${text.replace(/(const|let)\s+mapData\s*=/g, 'mapData =')} return mapData;`);
        const floorMapData = func();
        
        if (floorMapData) {
          renderSvgPaths(floorMapData, floorKey, blueprintBox);
        } else {
          showFallbackGrid(blueprintBox);
        }
      } catch (err) {
        console.warn(`Fallback for ${floorKey}:`, err);
        showFallbackGrid(blueprintBox);
      }
    }

    function renderSvgPaths(mapDataObj, floorKey, blueprintBox) {
      let currentMapPaths = null;
      const searchPatterns = {
        'h1': ['h1', '本館1', '本館 1'], 'h2': ['h2', '本館2', '本館 2'], 'h3': ['h3', '本館3', '本館 3', '新館b1'],
        's1': ['s1', '新館1', '新館 1', '本館4', '体育館'], 's2': ['s2', '新館2', '新館 2'], 's3': ['s3', '新館3', '新館 3']
      };
      
      const patterns = searchPatterns[floorKey] || [floorKey];
      for (const key in mapDataObj) {
        if (patterns.some(p => key.toLowerCase().includes(p.toLowerCase()))) {
          currentMapPaths = mapDataObj[key]; break;
        }
      }
      if (!currentMapPaths && Object.keys(mapDataObj).length > 0) currentMapPaths = mapDataObj[Object.keys(mapDataObj)[0]];

      if (currentMapPaths && Array.isArray(currentMapPaths)) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        let pathsHtml = currentMapPaths.map(p => {
          let attrs = '';
          if (p.attributes) {
            attrs = Object.entries(p.attributes).map(([k, v]) => `${k}="${v}"`).join(' ');
            if (p.attributes.d) {
              const parts = p.attributes.d.trim().split(/\s+/);
              for (let i = 0; i < parts.length; i++) {
                const cmd = parts[i].toUpperCase();
                if (cmd === 'M' || cmd === 'L') {
                  const x = parseFloat(parts[i+1]), y = parseFloat(parts[i+2]);
                  if (!isNaN(x) && !isNaN(y)) {
                    if (x < minX) minX = x; if (x > maxX) maxX = x;
                    if (y < minY) minY = y; if (y > maxY) maxY = y;
                  }
                }
              }
            }
          }
          return `<path ${attrs}></path>`;
        }).join('');

        let viewBoxStr = "0 0 5000 2000";
        if (minX !== Infinity && maxX !== -Infinity) {
          const padX = (maxX - minX) * 0.05, padY = (maxY - minY) * 0.05;
          viewBoxStr = `${Math.max(0, minX - padX)} ${Math.max(0, minY - padY)} ${(maxX - minX) + padX * 2} ${(maxY - minY) + padY * 2}`;
        }

        
        blueprintBox.innerHTML = `
          <div class="relative w-full h-full flex items-center justify-center p-2 min-w-0">
            <svg width="100%" height="100%" viewBox="${viewBoxStr}" class="max-w-full max-h-[600px] drop-shadow-sm pointer-events-none" preserveAspectRatio="xMidYMid meet">
              ${pathsHtml}
            </svg>
            <div id="pins-layer" class="absolute inset-0 pointer-events-auto"></div>
          </div>
        `;
        setupMapInteractions();
        renderPins(floorKey);
      } else {
        showFallbackGrid(blueprintBox);
      }
    }

    function showFallbackGrid(blueprintBox) {
      blueprintBox.innerHTML = `
        <div class="relative w-full h-[400px] bg-slate-100 flex items-center justify-center rounded">
          <svg class="absolute inset-0 w-full h-full stroke-slate-300 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
            <defs><pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M 40 0 L 0 0 0 40" fill="none" stroke-width="0.5"/></pattern></defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
          <div id="pins-layer" class="absolute inset-0 pointer-events-auto"></div>
        </div>
      `;
      setupMapInteractions();
      renderPins(currentFloor);
    }

    function setupMapInteractions() {
      const pinsLayer = document.getElementById('pins-layer');
      if(!pinsLayer) return;

      pinsLayer.addEventListener('click', (e) => {
        if (e.target.closest('.room-pin')) return;

        const rect = pinsLayer.getBoundingClientRect();
        const xPercent = ((e.clientX - rect.left) / rect.width) * 100;
        const yPercent = ((e.clientY - rect.top) / rect.height) * 100;

        document.getElementById('room-posx').value = xPercent.toFixed(2) + '%';
        document.getElementById('room-posy').value = yPercent.toFixed(2) + '%';

        let tempPin = document.getElementById('temp-pin-preview');
        if (!tempPin) {
          tempPin = document.createElement('div');
          tempPin.id = 'temp-pin-preview';
          tempPin.className = 'temp-pin flex items-center justify-center';
          tempPin.innerHTML = `<div class="bg-orange-500 text-white w-6 h-6 rounded-full flex items-center justify-center shadow-lg border-2 border-white"><i class="fa-solid fa-crosshairs text-[10px]"></i></div>`;
          pinsLayer.appendChild(tempPin);
        }
        tempPin.style.left = xPercent + '%';
        tempPin.style.top = yPercent + '%';

        if (!document.getElementById('form-title').innerHTML.includes('編集中')) {
           document.getElementById('form-title').innerHTML = '新規追加 <span class="text-xs font-normal text-slate-500 ml-2 text-orange-500">位置を選択しました</span>';
        }
      });
    }

    function renderPins(floorKey) {
      const pinsLayer = document.getElementById('pins-layer');
      if (!pinsLayer) return;

      Array.from(pinsLayer.querySelectorAll('.room-pin')).forEach(el => el.remove());

      Object.keys(localRoomsData).forEach(roomId => {
        const room = localRoomsData[roomId];
        if (room.floor === floorKey) {
          const pin = document.createElement('div');
          pin.className = 'room-pin flex items-center justify-center shadow rounded-full';
          pin.style.top = room.posY || '50%';
          pin.style.left = room.posX || '50%';

          let badgeColor = 'bg-slate-700 text-white';
          if (room.category === 'food') badgeColor = 'bg-orange-500 text-white';
          if (room.category === 'exhibition') badgeColor = 'bg-lime-500 text-slate-900';
          if (room.category === 'stage') badgeColor = 'bg-blue-500 text-white';

          
          pin.innerHTML = `
            <button onclick="editRoom('${roomId}', event)" class="pointer-events-auto px-2 py-1 ${badgeColor} font-bold text-[10px] shadow-sm rounded-full flex items-center gap-1 hover:ring-2 hover:ring-orange-400">
              <i class="fa-solid fa-pen text-[8px]"></i>
              <span>${room.roomName || roomId}</span>
            </button>
          `;
          pinsLayer.appendChild(pin);
        }
      });
    }

    
    window.resetForm = function() {
      const newId = currentFloor + '-' + Math.floor(Math.random() * 100000);
      document.getElementById('room-id').value = newId;
      document.getElementById('room-name').value = '';
      document.getElementById('room-title').value = '';
      document.getElementById('room-category').value = 'food';
      document.getElementById('room-desc').value = '';
      document.getElementById('room-tags').value = '';
      document.getElementById('room-posx').value = '';
      document.getElementById('room-posy').value = '';
      
      document.getElementById('form-title').innerHTML = '新規追加 <span class="text-xs font-normal text-slate-500 ml-2">(クリックで位置指定)</span>';
      
      const tempPin = document.getElementById('temp-pin-preview');
      if (tempPin) tempPin.remove();
    };

    window.editRoom = function(id, event) {
      if(event) {
        event.preventDefault();
        event.stopPropagation(); 
      }

      const room = localRoomsData[id];
      if (!room) return;

      if(currentFloor !== room.floor) {
        window.switchFloor(room.floor);
        setTimeout(() => loadDataToForm(id, room), 500);
      } else {
        loadDataToForm(id, room);
      }
    };

    function loadDataToForm(id, room) {
      document.getElementById('room-id').value = id;
      document.getElementById('room-floor').value = room.floor || currentFloor;
      document.getElementById('room-name').value = room.roomName || '';
      document.getElementById('room-title').value = room.title || '';
      document.getElementById('room-category').value = room.category || 'food';
      document.getElementById('room-desc').value = room.description || '';
      document.getElementById('room-tags').value = (room.tags || []).join(', ');
      document.getElementById('room-posx').value = room.posX || '';
      document.getElementById('room-posy').value = room.posY || '';
      
      document.getElementById('form-title').innerHTML = '編集モード <span class="text-xs font-normal text-orange-600 ml-2">※位置の再指定も可能です</span>';
      
      const tempPin = document.getElementById('temp-pin-preview');
      if (tempPin) tempPin.remove();
    }

    window.saveRoom = async function() {
      const id = document.getElementById('room-id').value.trim();
      const title = document.getElementById('room-title').value.trim();
      const posX = document.getElementById('room-posx').value.trim();
      const posY = document.getElementById('room-posy').value.trim();
      
      if (!title) { alert('企画タイトルは必須です。'); return; }
      if (!posX || !posY) { alert('マップをタップして位置を指定してください。'); return; }

      const tagsRaw = document.getElementById('room-tags').value;
      const tagsArray = tagsRaw.split(',').map(t => t.trim()).filter(t => t.length > 0);

      const roomData = {
        floor: document.getElementById('room-floor').value,
        roomName: document.getElementById('room-name').value.trim(),
        title: title,
        category: document.getElementById('room-category').value,
        description: document.getElementById('room-desc').value.trim(),
        tags: tagsArray,
        posX: posX,
        posY: posY,
        updatedAt: new Date().toISOString()
      };

      try {
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'map_rooms', id), roomData);
        showToast('保存しました。', 'success');
        resetForm();
      } catch (error) {
        console.error("Save Error: ", error);
        showToast('保存に失敗しました。', 'error');
      }
    };

    window.deleteRoom = async function(id) {
      if (confirm(`このブース情報を完全に削除しますか？\nこの操作は元に戻せません。`)) {
        try {
          await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'map_rooms', id));
          showToast('削除しました。', 'success');
          if (document.getElementById('room-id').value === id) resetForm();
        } catch (error) {
          console.error("Delete Error: ", error);
          showToast('削除に失敗しました。', 'error');
        }
      }
    };

    
    function renderRoomsTable() {
      const tbody = document.getElementById('rooms-list-table');
      const entries = Object.entries(localRoomsData);
      
      if (entries.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-slate-400 text-sm">データがありません</td></tr>';
        return;
      }

      const floorNames = {
        'h1': '本館1F', 'h2': '本館2F', 'h3': '本館3F',
        's1': '本館4F等', 's2': '新館2F', 's3': '新館3F'
      };
      
      const categoryNames = {
        'food': '<span class="text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded">模擬店</span>',
        'exhibition': '<span class="text-[10px] bg-lime-100 text-lime-700 px-2 py-0.5 rounded">展示</span>',
        'stage': '<span class="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded">ステージ</span>',
        'other': '<span class="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded">その他</span>'
      };

      tbody.innerHTML = entries.map(([id, room]) => `
        <tr class="hover:bg-slate-50 border-b border-gray-100">
          <td class="p-2 text-[11px] text-slate-600">${floorNames[room.floor] || room.floor}</td>
          <td class="p-2 text-xs font-bold text-slate-700">${room.roomName || '-'}</td>
          <td class="p-2 text-xs text-slate-800">${room.title || '（未設定）'}</td>
          <td class="p-2">${categoryNames[room.category] || categoryNames['other']}</td>
          <td class="p-2 text-center">
            <button onclick="editRoom('${id}')" class="text-blue-500 hover:text-blue-700 mx-1 p-1 text-xs"><i class="fa-solid fa-pen"></i></button>
            <button onclick="deleteRoom('${id}')" class="text-red-400 hover:text-red-600 mx-1 p-1 text-xs"><i class="fa-solid fa-trash"></i></button>
          </td>
        </tr>
      `).join('');
    }
