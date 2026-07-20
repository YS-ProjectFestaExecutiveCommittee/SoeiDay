import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
    import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
    import { getFirestore, collection, getDocs, onSnapshot, setDoc, doc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

    
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
    let allEvents = [];
    let allLocations = [];
    let currentDay = 1; 

    
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
        document.getElementById('loading-indicator').innerHTML = '<span class="text-red-500">データベースへの接続に失敗しました。</span>';
      }
    };

    
    const seedInitialDataIfNeeded = async () => {
      const locRef = collection(db, 'artifacts', appId, 'public', 'data', 'timetable_locations');
      const eventRef = collection(db, 'artifacts', appId, 'public', 'data', 'timetable_events');
      
      const locDocs = await getDocs(locRef);
      if (locDocs.empty) {
        const locations = [
          { id: 'loc1', name: '体育館', order: 1 },
          { id: 'loc2', name: '中庭ステージ', order: 2 },
          { id: 'loc3', name: '講堂', order: 3 },
          { id: 'loc4', name: 'エントランス', order: 4 }
        ];
        for (const loc of locations) {
          await setDoc(doc(locRef, loc.id), loc);
        }
      }

      const eventDocs = await getDocs(eventRef);
      if (eventDocs.empty) {
        const events = [
          { id: 'ev1', title: '開会式・オープニング', day: 1, locationId: 'loc1', startTime: '09:30', endTime: '10:00', color: 'bg-green-600 text-white', description: 'いよいよ創英祭が開幕！全校生徒で盛り上がりましょう。' },
          { id: 'ev2', title: '吹奏楽部コンサート', day: 1, locationId: 'loc1', startTime: '10:30', endTime: '11:30', color: 'bg-orange-500 text-white', description: '吹奏楽部による大迫力の演奏をお届けします。' },
          { id: 'ev3', title: '軽音楽部ライブ', day: 1, locationId: 'loc2', startTime: '11:00', endTime: '12:30', color: 'bg-blue-600 text-white', description: '屋外ステージでバンド演奏！' },
          { id: 'ev4', title: '演劇部公演「繋がり」', day: 1, locationId: 'loc3', startTime: '13:00', endTime: '14:30', color: 'bg-purple-600 text-white', description: '今年のテーマ「繋がり」を題材にしたオリジナル演劇です。' },
          { id: 'ev5', title: '書道部 パフォーマンス', day: 2, locationId: 'loc2', startTime: '10:00', endTime: '10:30', color: 'bg-red-600 text-white', description: '音楽に合わせたダイナミックな書道パフォーマンス！' },
          { id: 'ev6', title: 'ダンス部 発表会', day: 2, locationId: 'loc1', startTime: '11:00', endTime: '12:30', color: 'bg-pink-500 text-white', description: '日々の練習の成果を披露します。' },
          { id: 'ev7', title: '有志バンド・カラオケ大会', day: 2, locationId: 'loc2', startTime: '12:30', endTime: '14:30', color: 'bg-indigo-500 text-white', description: '生徒有志による熱いステージ！' },
          { id: 'ev8', title: '閉会式・エンディング', day: 2, locationId: 'loc1', startTime: '14:30', endTime: '15:00', color: 'bg-green-600 text-white', description: '今年の創英祭を締めくくる閉会式です。' },
        ];
        for (const ev of events) {
          await setDoc(doc(eventRef, ev.id), ev);
        }
      }
    };

    
    const setupListeners = () => {
      const locRef = collection(db, 'artifacts', appId, 'public', 'data', 'timetable_locations');
      const eventRef = collection(db, 'artifacts', appId, 'public', 'data', 'timetable_events');
      
      onSnapshot(locRef, (snapshot) => {
        allLocations = [];
        snapshot.forEach(doc => allLocations.push({ id: doc.id, ...doc.data() }));
        checkAndRender();
      }, (error) => console.error("Locations fetch error:", error));
      
      onSnapshot(eventRef, (snapshot) => {
        allEvents = [];
        snapshot.forEach(doc => allEvents.push({ id: doc.id, ...doc.data() }));
        checkAndRender();
      }, (error) => console.error("Events fetch error:", error));
    };

    
    const checkAndRender = () => {
      document.getElementById('loading-indicator').classList.add('hidden');
      document.getElementById('timetable-wrapper').classList.remove('hidden');
      renderTimetable();
    };

    
    const renderTimetable = () => {
      const container = document.getElementById('timetable-grid');
      if (!container) return;
      
      
      const sortedLocations = [...allLocations].sort((a, b) => (a.order || 0) - (b.order || 0));
      
      
      const dayEvents = allEvents.filter(ev => ev.day === currentDay);
      
      
      container.style.setProperty('--loc-count', sortedLocations.length > 0 ? sortedLocations.length : 1);
      
      let html = '';
      
      
      html += `<div class="grid-header time-col" style="grid-column: 1;">時刻</div>`;
      if (sortedLocations.length === 0) {
        html += `<div class="grid-header" style="grid-column: 2;">場所が登録されていません</div>`;
      } else {
        sortedLocations.forEach((loc, index) => {
          html += `<div class="grid-header" style="grid-column: ${index + 2};">${loc.name}</div>`;
        });
      }
      
      
      for (let i = 0; i < 22; i++) {
        const row = i + 2; 
        const totalMins = 9 * 60 + 30 + i * 15; 
        const h = Math.floor(totalMins / 60);
        const m = totalMins % 60;
        
        
        const timeStr = `${h}:${m === 0 ? '00' : m}`;
        html += `<div class="grid-time" style="grid-row: ${row};">${timeStr}</div>`;
        
        
        const isHour = (m === 0);
        const hourClass = isHour ? ' hour-line' : '';
        
        const colCount = Math.max(1, sortedLocations.length);
        for (let j = 0; j < colCount; j++) {
          html += `<div class="grid-cell${hourClass}" style="grid-row: ${row}; grid-column: ${j + 2};"></div>`;
        }
      }
      
      
      dayEvents.forEach(ev => {
        const locIndex = sortedLocations.findIndex(l => l.id === ev.locationId);
        if (locIndex === -1) return; 
        
        const startMins = parseTime(ev.startTime);
        const endMins = parseTime(ev.endTime);
        const baseMins = 9 * 60 + 30; 
        
        
        const startRow = Math.max(2, Math.floor((startMins - baseMins) / 15) + 2);
        const endRow = Math.min(24, Math.floor((endMins - baseMins) / 15) + 2);
        const col = locIndex + 2;
        
        const colorClass = ev.color || 'bg-slate-700 text-white';
        
        html += `
          <div class="grid-event ${colorClass}" 
               style="grid-row: ${startRow} / ${endRow}; grid-column: ${col};"
               onclick="window.showEventDetail('${ev.id}')">
            <div class="event-title">${ev.title}</div>
            <div class="event-time">${ev.startTime} - ${ev.endTime}</div>
          </div>
        `;
      });
      
      container.innerHTML = html;
    };

    
    const parseTime = (timeStr) => {
      if (!timeStr) return 0;
      const parts = timeStr.split(':');
      return parseInt(parts[0]) * 60 + parseInt(parts[1]);
    };

    
    document.getElementById('tab-day1').addEventListener('click', (e) => {
      currentDay = 1;
      updateTabs(e.target);
      renderTimetable();
    });
    
    document.getElementById('tab-day2').addEventListener('click', (e) => {
      currentDay = 2;
      updateTabs(e.target);
      renderTimetable();
    });

    const updateTabs = (activeTab) => {
      document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('border-brand-orange', 'text-brand-orange', 'dark:border-brand-orangeDark', 'dark:text-brand-orangeDark', 'active');
        btn.classList.add('border-transparent', 'text-slate-500', 'dark:text-slate-400');
      });
      activeTab.classList.remove('border-transparent', 'text-slate-500', 'dark:text-slate-400');
      activeTab.classList.add('border-brand-orange', 'text-brand-orange', 'dark:border-brand-orangeDark', 'dark:text-brand-orangeDark', 'active');
    };

    
    window.showEventDetail = (eventId) => {
      const ev = allEvents.find(e => e.id === eventId);
      if (!ev) return;
      
      const modal = document.getElementById('article-modal');
      const title = document.getElementById('modal-title');
      const date = document.getElementById('modal-date');
      const category = document.getElementById('modal-category');
      const body = document.getElementById('modal-body');
      
      title.textContent = ev.title;
      date.innerHTML = `第<span class="num-font">${ev.day}</span>日目 <span class="num-font">${ev.startTime}</span> - <span class="num-font">${ev.endTime}</span>`;
      
      const loc = allLocations.find(l => l.id === ev.locationId);
      category.textContent = loc ? loc.name : '場所未定';
      
      body.innerHTML = `
        <p>${ev.description || '詳細情報がまだ登録されていません。'}</p>
        ${ev.groupName ? `<p class="mt-4"><span class="font-bold">主催団体:</span> ${ev.groupName}</p>` : ''}
      `;
      
      modal.classList.remove('hidden');
      setTimeout(() => modal.classList.remove('opacity-0'), 10);
    };

    window.closeModal = () => {
      const modal = document.getElementById('article-modal');
      modal.classList.add('opacity-0');
      setTimeout(() => modal.classList.add('hidden'), 300);
    };

    
    initAuth();
    onAuthStateChanged(auth, async (user) => {
      currentUser = user;
      if (!user) return; 
      
      await seedInitialDataIfNeeded();
      setupListeners();
    });
