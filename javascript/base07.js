import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
    import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
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
    const appId = typeof __app_id !== 'undefined' ? __app_id : 'soei-fes-app';

    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);

    const fetchRecentNews = () => {
      const newsRef = collection(db, 'artifacts', appId, 'public', 'data', 'school_news');
      
      onSnapshot(newsRef, (snapshot) => {
        const data = [];
        snapshot.forEach(doc => {
          data.push({ id: doc.id, ...doc.data() });
        });

        
        data.sort((a, b) => {
          const dateA = new Date(a.date || '1970-01-01').getTime();
          const dateB = new Date(b.date || '1970-01-01').getTime();
          return dateB - dateA; 
        });

        
        const recentNews = data.slice(0, 3);
        const container = document.getElementById('news-container');

        if (recentNews.length === 0) {
          container.innerHTML = '<div class="py-12 text-center text-slate-500 font-light tracking-wider">現在、お知らせはありません。</div>';
          return;
        }

        let html = '';
        recentNews.forEach(item => {
          
          const isTopic = item.type === 'topic';
          const catLabel = isTopic ? 'トピック' : 'リリース';
          
          
          const catClass = isTopic 
            ? 'bg-brand-lime text-slate-900' 
            : 'bg-brand-orange text-white';

          
          html += `
            <a href="https://ys-projectfestaexecutivecommittee.github.io/SoeiDay/news/" class="group block border-b border-gray-200 dark:border-white/10 py-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition duration-300 px-4">
              <div class="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
                <div class="flex items-center gap-3 shrink-0">
                  <span class="text-sm font-medium tracking-widest text-slate-500 dark:text-slate-400 font-sans">${item.date || ''}</span>
                  <span class="${catClass} px-3 py-1 text-xs tracking-widest rounded-sm">${catLabel}</span>
                </div>
                <div class="flex-grow">
                  <h3 class="text-base md:text-lg font-medium text-slate-900 dark:text-slate-100 group-hover:text-brand-orange dark:group-hover:text-brand-orangeDark transition-colors leading-relaxed">${item.title || '無題'}</h3>
                </div>
                <div class="shrink-0 text-slate-300 dark:text-slate-600 group-hover:text-brand-orange dark:group-hover:text-brand-orangeDark transition-colors hidden sm:block">
                  <i class="fa-solid fa-chevron-right text-sm"></i>
                </div>
              </div>
            </a>
          `;
        });
        
        container.innerHTML = html;

      }, (error) => {
        console.error("Firestore fetch error:", error);
        document.getElementById('news-container').innerHTML = '<div class="py-12 text-center text-red-500 font-light">お知らせの取得に失敗しました。</div>';
      });
    };

    
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
      if (user) {
        fetchRecentNews();
      }
    });

    initAuth();
