import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
    import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
    import { getFirestore, collection, onSnapshot } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

    
    const themeToggleBtn = document.getElementById('theme-toggle');
    const darkIcon = document.getElementById('theme-toggle-dark-icon');
    const lightIcon = document.getElementById('theme-toggle-light-icon');

    function setTheme(isDark) {
      if (isDark) {
        document.documentElement.classList.add('dark');
        darkIcon.classList.add('hidden');
        lightIcon.classList.remove('hidden');
        localStorage.setItem('color-theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        lightIcon.classList.add('hidden');
        darkIcon.classList.remove('hidden');
        localStorage.setItem('color-theme', 'light');
      }
    }

    if (localStorage.getItem('color-theme') === 'dark' || (!('color-theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setTheme(true);
    } else {
      setTheme(false);
    }

    themeToggleBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      
      themeToggleBtn.classList.add('rotate-[360deg]');
      setTimeout(() => {
        themeToggleBtn.classList.remove('rotate-[360deg]');
      }, 300);

      if (document.documentElement.classList.contains('dark')) {
        setTheme(false);
      } else {
        setTheme(true);
      }
    });

    
    const btn = document.getElementById('mobile-menu-btn');
    const menu = document.getElementById('mobile-menu');
    btn.addEventListener('click', () => {
      menu.classList.toggle('hidden');
    });

    
    const slides = document.querySelectorAll('.slide');
    let currentSlide = 0;
    setInterval(() => {
      slides[currentSlide].classList.remove('active');
      currentSlide = (currentSlide + 1) % slides.length;
      slides[currentSlide].classList.add('active');
    }, 5000);

    
    function renderNewsUI(newsData) {
      const container = document.getElementById('news-container');
      container.innerHTML = ''; 

      if (newsData.length === 0) {
        container.innerHTML = '<p class="text-slate-500 font-light p-4 tracking-wider">現在お知らせはありません。</p>';
        return;
      }

      newsData.forEach((item) => {
        let tagColor = "text-slate-500 border-slate-300 dark:border-slate-600";
        if (item.tag === "重要") tagColor = "text-brand-lime dark:text-brand-limeDark border-brand-lime dark:border-brand-limeDark font-medium";
        else if (item.tag === "お知らせ") tagColor = "text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-600";
        else if (item.tag === "スケジュール") tagColor = "text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-600";

        const html = `
          <a href="news.html" class="block news-link py-5 px-4 sm:px-6 border-b border-gray-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors duration-300">
            <div class="flex flex-col md:flex-row md:items-center gap-3 md:gap-8">
              <div class="flex items-center gap-6 md:w-1/3 lg:w-1/4">
                <span class="text-slate-500 dark:text-slate-400 text-sm tracking-wider font-light">${item.date}</span>
                <span class="text-xs px-3 py-1 border ${tagColor} tracking-wider">${item.tag}</span>
              </div>
              <div class="md:w-2/3 lg:w-3/4">
                <h3 class="font-medium md:text-[1.05rem] tracking-wide leading-relaxed text-slate-900 dark:text-white">${item.title}</h3>
              </div>
            </div>
          </a>
        `;
        container.innerHTML += html;
      });
    }

    const fallbackNews = [
      { date: "2026.09.28", tag: "お知らせ", title: "創英祭特設サイトを公開しました。今年のテーマは「創」です。" },
      { date: "2026.09.25", tag: "重要", title: "ご来場時の注意事項について（必ずご一読ください）" },
      { date: "2026.09.20", tag: "スケジュール", title: "各ステージ・体育館イベントのタイムテーブルを公開いたしました。" },
      { date: "2026.09.15", tag: "お知らせ", title: "模擬店の出店一覧を更新いたしました。" }
    ];

    renderNewsUI(fallbackNews);

    
    const initFirebase = async () => {
      try {
        const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : null;
        if (!firebaseConfig) return;

        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);
        const db = getFirestore(app);
        const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }

        onAuthStateChanged(auth, (user) => {
          if (!user) return;
          const newsRef = collection(db, 'artifacts', appId, 'public', 'data', 'news');
          
          onSnapshot(newsRef, (snapshot) => {
            if (snapshot.empty) return;
            
            let newsArray = [];
            snapshot.forEach((doc) => newsArray.push({ id: doc.id, ...doc.data() }));
            newsArray.sort((a, b) => new Date(b.date.replace(/\./g, '/')) - new Date(a.date.replace(/\./g, '/')));
            
            renderNewsUI(newsArray.slice(0, 4));
          }, (error) => console.error("Error fetching news:", error));
        });
      } catch (error) {
        console.error("Firebase init error:", error);
      }
    };

    initFirebase();
