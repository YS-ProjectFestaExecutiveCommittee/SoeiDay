import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
    
    
    const firebaseConfig = {
  apiKey: "AIzaSyCDWj4xWfU42x2NG1tOSlXcBC-f2vhC3lA",
  authDomain: "soeiday.firebaseapp.com",
  projectId: "soeiday",
  storageBucket: "soeiday.firebasestorage.app",
  messagingSenderId: "122257503471",
  appId: "1:122257503471:web:8014972f2bc10f84ea971a",
  measurementId: "G-EX7FJGF5R0"
};

    if (!getApps().length) {
      initializeApp(firebaseConfig);
    }
