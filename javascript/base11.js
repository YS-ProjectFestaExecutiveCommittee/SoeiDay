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

    let allBooths = [];

    
    const categoryOrder = [
      "新館3階",
      "新館2階",
      "新館1階",
      "本館4階",
      "本館3階",
      "その他" 
    ];

    
    const defaultImage = "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=600&q=80";

    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          try {
            await signInWithCustomToken(auth, __initial_auth_token);
          } catch (tokenError) {
            await signInAnonymously(auth);
          }
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Auth error:", error);
        document.getElementById('loading-indicator').innerHTML = '<span class="text-red-500">接続に失敗しました。</span>';
      }
    };

    
    const seedInitialDataIfNeeded = async () => {
      try {
        const boothRef = collection(db, 'artifacts', appId, 'public', 'data', 'school_booths');
        const docs = await getDocs(boothRef);
        
        if (docs.empty) {
          const dummyData = [
            { id: 'b1', name: 'メイド喫茶・アリス', group: '2年A組', category: '新館3階', room: '2A教室', description: '手作りのクッキーと紅茶でおもてなしします。アリスの世界観を再現した装飾にもご注目！', imageBase64: '' },
            { id: 'b2', name: 'お化け屋敷「廃校の呪い」', group: '2年B組', category: '新館2階', room: '2B教室', description: '学校の怪談をテーマにした本格お化け屋敷。あなたは最後まで辿り着けるか…？', imageBase64: '' },
            { id: 'b3', name: '写真部 展示会', group: '写真部', category: '本館4階', room: '第1会議室', description: '部員がこの1年で撮り溜めた数々の作品を展示します。ポストカードの販売もあります。', imageBase64: '' },
            { id: 'b4', name: '縁日パーク', group: '1年C組', category: '本館3階', room: '1C教室', description: '射的、ヨーヨー釣り、型抜きなど、昔懐かしい縁日遊びが盛りだくさん！景品もあります。', imageBase64: '' },
            { id: 'b5', name: '焼きそば「創英亭」', group: 'サッカー部', category: '新館1階', room: 'ピロティ', description: '部員たちが鉄板で焼き上げる熱々の焼きそば！特製ソースが決め手です。', imageBase64: '' },
            { id: 'b6', name: 'プラネタリウム', group: '天文部', category: '新館3階', room: '地学室', description: '手作りのドームで満天の星空を再現します。秋の星座の生解説付き。', imageBase64: '' }
          ];
          for (const item of dummyData) {
            await setDoc(doc(boothRef, item.id), item);
          }
        }
      } catch (error) {
        console.warn("初期データ書き込みスキップ:", error);
      }
    };

    const setupListeners = () => {
      const boothRef = collection(db, 'artifacts', appId, 'public', 'data', 'school_booths');
      
      onSnapshot(boothRef, (snapshot) => {
        allBooths = [];
        snapshot.forEach(d => allBooths.push({ id: d.id, ...d.data() }));
        renderBooths();
      }, (error) => {
        console.error("Fetch error:", error);
      });
    };

    const renderBooths = () => {
      document.getElementById('loading-indicator').classList.add('hidden');
      const container = document.getElementById('booths-container');
      container.classList.remove('hidden');
      
      if (allBooths.length === 0) {
        container.innerHTML = '<div class="text-center py-12 text-slate-500">現在、登録されている出店情報はありません。</div>';
        return;
      }

      
      const grouped = {};
      categoryOrder.forEach(cat => grouped[cat] = []);
      
      allBooths.forEach(booth => {
        const cat = booth.category || 'その他';
        if (!grouped[cat]) grouped[cat] = []; 
        grouped[cat].push(booth);
      });

      let html = '';

      
      categoryOrder.forEach(category => {
        const boothsInCategory = grouped[category];
        if (!boothsInCategory || boothsInCategory.length === 0) return; 

        html += `
          <div class="booth-category-section">
            <h3 class="category-header text-2xl font-bold text-slate-800 dark:text-white mb-8 tracking-widest">${category}</h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
        `;

        boothsInCategory.forEach(booth => {
          const imgSrc = booth.imageBase64 || defaultImage;
          
          html += `
            <div class="booth-card bg-white dark:bg-slate-800 rounded-sm overflow-hidden border border-gray-100 dark:border-slate-700 shadow-sm cursor-pointer" onclick="window.openBoothModal('${booth.id}')">
              <div class="h-48 w-full overflow-hidden bg-slate-100 dark:bg-slate-900 relative">
                <img src="${imgSrc}" alt="${booth.name}" class="w-full h-full object-cover transition-transform duration-500 hover:scale-105">
                <div class="absolute top-3 left-3 bg-slate-900/80 text-white text-xs px-2 py-1 rounded-sm tracking-wider font-sans backdrop-blur-sm">
                  ${booth.room || '場所未定'}
                </div>
              </div>
              <div class="p-6">
                <div class="text-xs text-slate-500 dark:text-slate-400 font-sans mb-2 tracking-wider">${booth.group || '団体未定'}</div>
                <h4 class="text-lg font-bold text-slate-900 dark:text-white mb-3 tracking-widest line-clamp-1">${booth.name}</h4>
                <p class="text-sm text-slate-600 dark:text-slate-300 font-light line-clamp-2 leading-relaxed">${booth.description || ''}</p>
              </div>
            </div>
          `;
        });

        html += `
            </div>
          </div>
        `;
      });

      
      Object.keys(grouped).forEach(cat => {
        if (!categoryOrder.includes(cat) && grouped[cat].length > 0) {
           html += `
            <div class="booth-category-section mt-12">
              <h3 class="category-header text-2xl font-bold text-slate-800 dark:text-white mb-6 tracking-widest">${cat}</h3>
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          `;
          grouped[cat].forEach(booth => {
             const imgSrc = booth.imageBase64 || defaultImage;
             html += `
              <div class="booth-card bg-white dark:bg-slate-800 rounded-sm overflow-hidden border border-gray-100 dark:border-slate-700 shadow-sm cursor-pointer" onclick="window.openBoothModal('${booth.id}')">
                <div class="h-48 w-full overflow-hidden bg-slate-100 dark:bg-slate-900">
                  <img src="${imgSrc}" alt="${booth.name}" class="w-full h-full object-cover">
                </div>
                <div class="p-5">
                  <h4 class="text-lg font-bold text-slate-900 dark:text-white mb-2 tracking-widest line-clamp-1">${booth.name}</h4>
                  <p class="text-sm text-slate-600 dark:text-slate-300 font-light line-clamp-2 leading-relaxed">${booth.description || ''}</p>
                </div>
              </div>
            `;
          });
          html += `</div></div>`;
        }
      });

      container.innerHTML = html;
    };

    
    window.openBoothModal = (boothId) => {
      const booth = allBooths.find(b => b.id === boothId);
      if (!booth) return;
      
      const modal = document.getElementById('booth-modal');
      document.getElementById('modal-booth-img').src = booth.imageBase64 || defaultImage;
      document.getElementById('modal-booth-category').textContent = booth.category || 'その他';
      document.getElementById('modal-booth-room').textContent = booth.room || '';
      document.getElementById('modal-booth-title').textContent = booth.name;
      document.getElementById('modal-booth-group').textContent = booth.group || '団体未定';
      document.getElementById('modal-booth-desc').textContent = booth.description || '詳細情報はありません。';
      
      modal.classList.remove('hidden');
      setTimeout(() => modal.classList.remove('opacity-0'), 10);
    };

    window.closeBoothModal = () => {
      const modal = document.getElementById('booth-modal');
      modal.classList.add('opacity-0');
      setTimeout(() => modal.classList.add('hidden'), 300);
    };

    
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        await seedInitialDataIfNeeded();
        setupListeners();
      }
    });
    initAuth();
