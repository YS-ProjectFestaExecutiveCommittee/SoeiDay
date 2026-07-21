import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js';
    import { getAuth, signInAnonymously, signInWithCustomToken } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js';
    import { getFirestore, collection, onSnapshot } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';

    
    const appId = typeof __app_id !== 'undefined' ? __app_id : 'soei-day-2026';
    
    
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
    const auth = getAuth(app);
    const db = getFirestore(app);

    let roomsData = {};
    let currentFloor = 'h1';
    let selectedRoomId = null;

    const floorTitles = {
      'h1': '本館 1F フロアマップ',
      'h2': '本館 2F フロアマップ',
      'h3': '本館 3F / 新館 B1F フロアマップ',
      's1': '本館 4F / 新館 1F / 体育館 フロアマップ',
      's2': '新館 2F フロアマップ',
      's3': '新館 3F フロアマップ'
    };

    
    async function initAuth() {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.warn("Auth initialization fallback:", err);
      }
    }

    
    function subscribeToRoomUpdates() {
      
      const roomsRef = collection(db, 'artifacts', appId, 'public', 'data', 'map_rooms');
      
      onSnapshot(roomsRef, (snapshot) => {
        roomsData = {};
        snapshot.forEach((doc) => {
          roomsData[doc.id] = doc.data();
        });
        
        
        renderMap(currentFloor);
        renderBoothsList();

        
        if (selectedRoomId && roomsData[selectedRoomId]) {
          window.selectRoom(selectedRoomId);
        }
      }, (error) => {
        console.error("Error fetching map rooms: ", error);
        useFallbackData();
        renderMap(currentFloor);
        renderBoothsList();
      });
    }

    function useFallbackData() {
      roomsData = {
        'h1-101': {
          floor: 'h1',
          roomName: '101教室',
          title: '3年A組 縁日屋台',
          category: 'food',
          description: '射的や金魚すくいが楽しめる伝統的な祭りブースです！オリジナル景品も多数準備しています。',
          tags: ['体験', 'ゲーム', '景品あり'],
          posX: '25%',
          posY: '35%',
          updatedAt: new Date().toISOString()
        },
        'h1-102': {
          floor: 'h1',
          roomName: '102教室',
          title: '美術部 作品展',
          category: 'exhibition',
          description: '油絵・水彩画・デジタルイラストなど、部員の渾身の作品を展示中。手作りポストカードの販売もあります。',
          tags: ['展示', '販売'],
          posX: '50%',
          posY: '35%',
          updatedAt: new Date().toISOString()
        }
      };
    }

    
    window.switchFloor = function(floorKey) {
      currentFloor = floorKey;
      
      
      document.querySelectorAll('.floor-btn').forEach(btn => {
        btn.classList.remove('active-floor', 'bg-slate-900', 'text-white', 'dark:bg-white', 'dark:text-slate-900', 'border-transparent');
        btn.classList.add('border-gray-300', 'dark:border-slate-700', 'text-slate-700', 'dark:text-slate-300');
      });

      const activeBtn = document.getElementById(`btn-${floorKey}`);
      if (activeBtn) {
        activeBtn.classList.add('active-floor', 'bg-slate-900', 'text-white', 'dark:bg-white', 'dark:text-slate-900', 'border-transparent');
      }

      
      const titleElem = document.getElementById('current-floor-title');
      if (titleElem) {
        titleElem.querySelector('span').textContent = floorTitles[floorKey] || 'フロアマップ';
      }

      renderMap(floorKey);
    };

    
    function renderMap(floorKey) {
      const container = document.getElementById('blueprint-render-target');
      if (!container) return;

      container.innerHTML = '';

      
      const blueprintBox = document.createElement('div');
      blueprintBox.className = 'w-full h-full relative flex items-center justify-center min-h-[420px] bg-white dark:bg-slate-900 border border-dashed border-gray-300 dark:border-slate-700 p-4 rounded-sm';

      
      const possibleKeys = [
        `blueprint_${floorKey}`,
        floorKey,
        `blueprint${floorKey.toUpperCase()}`,
        `${floorKey}Blueprint`,
        `blueprint_${floorKey.toLowerCase()}`
      ];

      let blueprintObj = null;
      for (const key of possibleKeys) {
        if (window[key]) {
          blueprintObj = window[key];
          break;
        }
      }

      let renderedSuccessfully = false;

      if (blueprintObj) {
        try {
          if (typeof blueprintObj.render === 'function') {
            blueprintObj.render(blueprintBox);
            renderedSuccessfully = true;
          } else if (typeof blueprintObj.draw === 'function') {
            blueprintObj.draw(blueprintBox);
            renderedSuccessfully = true;
          } else if (typeof blueprintObj.init === 'function') {
            blueprintObj.init(blueprintBox);
            renderedSuccessfully = true;
          } else if (typeof blueprintObj === 'function') {
            blueprintObj(blueprintBox);
            renderedSuccessfully = true;
          } else if (typeof blueprintObj === 'string') {
            blueprintBox.innerHTML = blueprintObj;
            renderedSuccessfully = true;
          } else if (blueprintObj instanceof HTMLElement || blueprintObj instanceof SVGElement) {
            blueprintBox.appendChild(blueprintObj.cloneNode(true));
            renderedSuccessfully = true;
          }
        } catch (e) {
          console.error(`Error rendering blueprint for ${floorKey}:`, e);
        }
      }

      container.appendChild(blueprintBox);

      
      if (!renderedSuccessfully) {
        
        
        fetchMapDataAndRender(floorKey, blueprintBox);
      } else {
        
        renderPins(floorKey, blueprintBox);
      }
    }

    async function fetchMapDataAndRender(floorKey, blueprintBox) {
      try {
        blueprintBox.innerHTML = `<div class="w-full h-full flex items-center justify-center text-slate-400"><i class="fa-solid fa-spinner fa-spin mr-2"></i> マップデータを読み込んでいます...</div>`;
        
        const url = `https://ys-projectfestaexecutivecommittee.github.io/SoeiDay/blueprint/${floorKey}.js`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Network response was not ok');
        const text = await response.text();
        
        
        const func = new Function(`
          var mapData;
          ${text.replace(/(const|let)\s+mapData\s*=/g, 'mapData =')}
          return mapData;
        `);
        const floorMapData = func();
        
        if (floorMapData) {
          renderSvgPaths(floorMapData, floorKey, blueprintBox);
        } else {
          throw new Error('Parsed mapData is empty');
        }
      } catch (err) {
        console.warn(`Failed to fetch/parse ${floorKey}.js, using fallback:`, err);
        
        let mapDataObj = null;
        if (typeof mapData !== 'undefined') { mapDataObj = mapData; } 
        else if (window[`mapData_${floorKey}`]) { mapDataObj = window[`mapData_${floorKey}`]; }
        
        if (mapDataObj) {
          renderSvgPaths(mapDataObj, floorKey, blueprintBox);
        } else {
          showFallbackGrid(blueprintBox, floorKey);
        }
      }
    }

    function renderSvgPaths(mapDataObj, floorKey, blueprintBox) {
      let currentMapPaths = null;
      
      const searchPatterns = {
        'h1': ['h1', '本館1', '本館 1'],
        'h2': ['h2', '本館2', '本館 2'],
        'h3': ['h3', '本館3', '本館 3', '新館b1', '新館 b1'],
        's1': ['s1', '新館1', '新館 1', '本館4', '本館 4', '体育館'],
        's2': ['s2', '新館2', '新館 2'],
        's3': ['s3', '新館3', '新館 3']
      };
      
      const patterns = searchPatterns[floorKey] || [floorKey];
      for (const key in mapDataObj) {
        const lowerKey = key.toLowerCase();
        if (patterns.some(p => lowerKey.includes(p.toLowerCase()))) {
          currentMapPaths = mapDataObj[key];
          break;
        }
      }
      
      
      if (!currentMapPaths && Object.keys(mapDataObj).length > 0) {
        currentMapPaths = mapDataObj[Object.keys(mapDataObj)[0]];
      }

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
                  const x = parseFloat(parts[i+1]);
                  const y = parseFloat(parts[i+2]);
                  if (!isNaN(x) && !isNaN(y)) {
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                  }
                }
              }
            }
          }
          const tagName = p.type || 'path';
          return `<${tagName} id="${p.id || ''}" ${attrs}></${tagName}>`;
        }).join('');

        let viewBoxStr = "0 0 5000 2000"; 
        if (minX !== Infinity && maxX !== -Infinity) {
          const padX = (maxX - minX) * 0.05;
          const padY = (maxY - minY) * 0.05;
          const vX = Math.max(0, minX - padX);
          const vY = Math.max(0, minY - padY);
          const vW = (maxX - minX) + padX * 2;
          const vH = (maxY - minY) + padY * 2;
          viewBoxStr = `${vX} ${vY} ${vW} ${vH}`;
        }

        blueprintBox.innerHTML = `
          <div class="relative w-full h-full flex items-center justify-center p-2">
            <svg viewBox="${viewBoxStr}" class="w-full h-full max-h-[600px] drop-shadow-sm" preserveAspectRatio="xMidYMid meet">
              ${pathsHtml}
            </svg>
            <div id="pins-layer" class="absolute inset-0 pointer-events-auto"></div>
          </div>
        `;
        renderPins(floorKey, blueprintBox);
      } else {
        showFallbackGrid(blueprintBox, floorKey);
      }
    }

    function showFallbackGrid(blueprintBox, floorKey) {
      blueprintBox.innerHTML = `
        <div class="relative w-full h-[400px] bg-slate-100 dark:bg-slate-950 flex items-center justify-center rounded overflow-hidden">
          <svg class="absolute inset-0 w-full h-full stroke-slate-300 dark:stroke-slate-800" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke-width="0.5"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
          <div id="pins-layer" class="absolute inset-0 pointer-events-auto"></div>
        </div>
      `;
      renderPins(floorKey, blueprintBox);
    }

    function renderPins(floorKey, blueprintBox) {
      let pinsLayer = blueprintBox.querySelector('#pins-layer');
      if (!pinsLayer) {
        pinsLayer = document.createElement('div');
        pinsLayer.id = 'pins-layer';
        pinsLayer.className = 'absolute inset-0 pointer-events-auto';
        blueprintBox.appendChild(pinsLayer);
      }
      pinsLayer.style.position = 'absolute';
      pinsLayer.style.inset = '0';
      pinsLayer.style.pointerEvents = 'auto';

      
      const presetCoordinates = {
        'h1-101': { top: '35%', left: '25%' },
        'h1-102': { top: '35%', left: '50%' },
        'h1-103': { top: '35%', left: '75%' },
        'h2-201': { top: '50%', left: '30%' },
        'h2-202': { top: '50%', left: '60%' }
      };

      
      Object.keys(roomsData).forEach(roomId => {
        const room = roomsData[roomId];
        if (room.floor === floorKey) {
          
          const topPos = room.posY || (presetCoordinates[roomId] ? presetCoordinates[roomId].top : '50%');
          const leftPos = room.posX || (presetCoordinates[roomId] ? presetCoordinates[roomId].left : '50%');
          
          const pin = document.createElement('div');
          pin.className = 'room-pin flex items-center justify-center shadow-lg rounded-full cursor-pointer transition-transform duration-200';
          pin.style.top = topPos;
          pin.style.left = leftPos;

          let badgeColor = 'bg-brand-orange text-white';
          if (room.category === 'exhibition') badgeColor = 'bg-brand-lime text-slate-900';
          if (room.category === 'stage') badgeColor = 'bg-blue-500 text-white';
          if (room.category === 'other') badgeColor = 'bg-slate-500 text-white';

          pin.innerHTML = `
            <button onclick="selectRoom('${roomId}')" class="px-3 py-1.5 ${badgeColor} font-bold text-xs shadow-md rounded-full flex items-center gap-1.5 hover:scale-105 transition-transform">
              <i class="fa-solid fa-location-dot"></i>
              <span>${room.roomName || roomId}</span>
            </button>
          `;

          pinsLayer.appendChild(pin);
        }
      });
    }

    
    window.selectRoom = function(roomId) {
      selectedRoomId = roomId;
      const room = roomsData[roomId];
      const container = document.getElementById('room-detail-container');
      const badgeElem = document.getElementById('selected-room-id');

      if (badgeElem) badgeElem.textContent = (room && room.roomName) ? room.roomName : roomId.toUpperCase();

      if (!room || !container) return;

      let categoryBadge = '<span class="px-2 py-0.5 text-xs bg-orange-100 text-brand-orange font-medium rounded">模擬店</span>';
      if (room.category === 'exhibition') {
        categoryBadge = '<span class="px-2 py-0.5 text-xs bg-green-100 text-emerald-700 font-medium rounded">展示</span>';
      } else if (room.category === 'stage') {
        categoryBadge = '<span class="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 font-medium rounded">ステージ</span>';
      } else if (room.category === 'other') {
        categoryBadge = '<span class="px-2 py-0.5 text-xs bg-slate-100 text-slate-700 font-medium rounded">その他</span>';
      }

      const tagsHtml = (room.tags || []).map(t => `<span class="text-[11px] px-2 py-0.5 bg-gray-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded">#${t}</span>`).join(' ');

      container.innerHTML = `
        <div class="space-y-4 animate-fade-in">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-slate-400 font-mono">${room.roomName || roomId}</span>
            ${categoryBadge}
          </div>

          <h4 class="text-xl font-bold text-slate-900 dark:text-white border-b border-gray-100 dark:border-slate-700 pb-2">
            ${room.title || '名称未設定'}
          </h4>

          <p class="text-sm text-slate-600 dark:text-slate-300 font-light leading-relaxed">
            ${room.description || '詳細情報はまだ入力されていません。'}
          </p>

          ${room.tags && room.tags.length > 0 ? `<div class="flex flex-wrap gap-1 pt-2">${tagsHtml}</div>` : ''}

          <div class="pt-4 border-t border-gray-100 dark:border-slate-700 flex justify-end">
            <button class="text-xs text-brand-orange hover:underline flex items-center gap-1 font-medium">
              <span>詳細ページを見る</span>
              <i class="fa-solid fa-angle-right"></i>
            </button>
          </div>
        </div>
      `;
    };

    
    function renderBoothsList() {
      const grid = document.getElementById('booths-grid');
      if (!grid) return;

      const searchVal = (document.getElementById('booth-search-input')?.value || '').toLowerCase();
      const entries = Object.entries(roomsData).filter(([id, room]) => {
        if (!searchVal) return true;
        return (room.title && room.title.toLowerCase().includes(searchVal)) ||
               (room.description && room.description.toLowerCase().includes(searchVal)) ||
               (room.roomName && room.roomName.toLowerCase().includes(searchVal));
      });

      if (entries.length === 0) {
        grid.innerHTML = `
          <div class="col-span-full text-center py-12 text-slate-400 font-light">
            該当するブースが見つかりませんでした。
          </div>
        `;
        return;
      }

      grid.innerHTML = entries.map(([id, room]) => `
        <div onclick="selectRoom('${id}'); if(currentFloor !== '${room.floor}') switchFloor('${room.floor}');" class="bg-white dark:bg-slate-800 p-6 shadow-md hover:shadow-lg transition-shadow border border-gray-100 dark:border-white/5 rounded-sm cursor-pointer flex flex-col justify-between group">
          <div>
            <div class="flex items-center justify-between mb-3">
              <span class="text-xs font-bold text-brand-orange font-mono">${room.roomName || id}</span>
              <span class="text-xs text-slate-400 font-light">${floorTitles[room.floor] || ''}</span>
            </div>
            <h3 class="text-lg font-bold text-slate-900 dark:text-white mb-2 group-hover:text-brand-orange transition-colors">
              ${room.title || 'ブース名'}
            </h3>
            <p class="text-xs text-slate-600 dark:text-slate-300 font-light line-clamp-3 leading-relaxed mb-4">
              ${room.description || ''}
            </p>
          </div>
          <div class="flex items-center justify-between text-xs text-slate-400 border-t border-gray-100 dark:border-slate-700/50 pt-3">
            <span>タップしてマップ位置を確認</span>
            <i class="fa-solid fa-arrow-right group-hover:translate-x-1 transition-transform text-brand-orange"></i>
          </div>
        </div>
      `).join('');
    }

    
    document.getElementById('booth-search-input')?.addEventListener('input', renderBoothsList);

    
    window.addEventListener('DOMContentLoaded', async () => {
      await initAuth();
      subscribeToRoomUpdates();
      window.switchFloor('h1');
    });
