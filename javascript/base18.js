import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
    import { getAuth, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

    
    const firebaseConfig = {
  apiKey: "AIzaSyCDWj4xWfU42x2NG1tOSlXcBC-f2vhC3lA",
  authDomain: "soeiday.firebaseapp.com",
  projectId: "soeiday",
  storageBucket: "soeiday.firebasestorage.app",
  messagingSenderId: "122257503471",
  appId: "1:122257503471:web:8014972f2bc10f84ea971a",
  measurementId: "G-EX7FJGF5R0"
};

    
    const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    const auth = getAuth(app);
    const googleProvider = new GoogleAuthProvider();

    
    window.attemptLogin = async () => {
      const email = document.getElementById('login-email').value;
      const password = document.getElementById('login-password').value;
      const errorMsg = document.getElementById('login-error');
      
      try {
        errorMsg.classList.add('hidden');
        await signInWithEmailAndPassword(auth, email, password);
      } catch (error) {
        errorMsg.classList.remove('hidden');
        errorMsg.innerText = 'ログインに失敗しました。メールアドレスまたはパスワードを確認してください。';
        console.error(error);
      }
    };

    window.loginWithGoogle = async () => {
      const errorMsg = document.getElementById('login-error');
      try {
        errorMsg.classList.add('hidden');
        await signInWithPopup(auth, googleProvider);
      } catch (error) {
        errorMsg.classList.remove('hidden');
        errorMsg.innerText = 'Google認証に失敗しました。';
        console.error(error);
      }
    };

    window.logout = async () => {
      try {
        await signOut(auth);
      } catch (error) {
        console.error("ログアウトエラー:", error);
      }
    };

    window.createUser = async () => {
      const email = document.getElementById('new-user-email').value;
      const password = document.getElementById('new-user-password').value;
      
      if (!email || !password) {
        alert("メールアドレスとパスワードを入力してください。");
        return;
      }

      try {
        
        await createUserWithEmailAndPassword(auth, email, password);
        alert('新しいアカウントを作成しました。\nセキュリティ上、自動的に新しいアカウントに切り替わりました。\n管理作業を続ける場合は一度ログアウトし、元のアカウントで入り直してください。');
        
        document.getElementById('new-user-email').value = '';
        document.getElementById('new-user-password').value = '';
      } catch (error) {
        alert('アカウント作成に失敗しました: ' + error.message);
      }
    };

    
    onAuthStateChanged(auth, (user) => {
      const loadingOverlay = document.getElementById('loading-overlay');
      const loginSection = document.getElementById('login-section');
      const dashboardSection = document.getElementById('dashboard-section');
      const userInfo = document.getElementById('header-user-info');
      const currentUserDisplay = document.getElementById('current-user-display');

      if (user) {
        
        loginSection.classList.add('hidden');
        dashboardSection.classList.remove('hidden');
        userInfo.classList.remove('hidden');
        currentUserDisplay.innerText = user.displayName || user.email;
        
        
      } else {
        
        loginSection.classList.remove('hidden');
        dashboardSection.classList.add('hidden');
        userInfo.classList.add('hidden');
      }

      if (loadingOverlay) {
        loadingOverlay.classList.add('hidden');
      }
    });
