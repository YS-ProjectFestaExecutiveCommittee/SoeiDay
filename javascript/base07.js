import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getFirestore, collection, getDocs, limit, query, where } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyA5uU-q3FEcElflECG6dc4AckxxX7iKj-s",
  authDomain: "soeiday-b3b5f.firebaseapp.com",
  projectId: "soeiday-b3b5f",
  storageBucket: "soeiday-b3b5f.firebasestorage.app",
  messagingSenderId: "911210293928",
  appId: "1:911210293928:web:8ce217bfe7d5f4d837f09d",
  measurementId: "G-1H9MSJMVQP"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

function getMillis(value) {
  if (!value) return 0;
  if (typeof value.toMillis === "function") return value.toMillis();
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}

function formatDate(value) {
  if (!value) return "";
  const date = typeof value.toDate === "function" ? value.toDate() : new Date(value);
  return Number.isNaN(date.getTime()) ? "" : new Intl.DateTimeFormat("ja-JP", { year:"numeric", month:"2-digit", day:"2-digit" }).format(date);
}

function excerptFromHtml(html, max = 54) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html || "", "text/html");
  const text = (doc.body.textContent || "").replace(/\s+/g, " ").trim();
  return text.length <= max ? text : `${text.slice(0, max)}…`;
}

function makeNewsRow(item) {
  const number = Number(item.number);
  if (!Number.isInteger(number) || number < 1) return null;

  const anchor = document.createElement("a");
  anchor.href = `/news/#${number}`;
  anchor.className = "group block border-b border-gray-200 dark:border-white/10 py-5 hover:opacity-75 transition-opacity";

  const meta = document.createElement("div");
  meta.className = "flex flex-wrap items-center gap-2 mb-2";

  const date = document.createElement("time");
  date.className = "text-xs text-slate-500 dark:text-slate-400 font-sans tracking-wider";
  date.textContent = formatDate(item.createdAt);

  const badge = document.createElement("span");
  badge.className = item.type === "news_release"
    ? "text-[10px] tracking-widest font-sans font-bold text-brand-lime dark:text-brand-limeDark"
    : "text-[10px] tracking-widest font-sans font-bold text-brand-orange dark:text-brand-orangeDark";
  badge.textContent = item.type === "news_release" ? "ニュースリリース" : "トピック";

  meta.append(date, badge);

  const title = document.createElement("h3");
  title.className = "text-base md:text-lg font-bold tracking-wide text-slate-900 dark:text-white";
  title.textContent = item.title || "無題の投稿";

  const excerpt = document.createElement("p");
  excerpt.className = "text-xs md:text-sm text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed";
  excerpt.textContent = excerptFromHtml(item.content);

  const numberLabel = document.createElement("p");
  numberLabel.className = "text-[10px] font-sans tracking-widest text-slate-400 dark:text-slate-500 mt-2";
  numberLabel.textContent = `NEWS #${number}`;

  anchor.append(meta, title, excerpt, numberLabel);
  return anchor;
}

async function renderLatestNews() {
  const container = document.getElementById("news-container");
  if (!container) return;

  try {
    const q = query(collection(db, "news"), where("published", "==", true), limit(100));
    const snapshot = await getDocs(q);
    const items = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((item) => Number.isInteger(Number(item.number)) && Number(item.number) > 0)
      .sort((a, b) => Number(b.number) - Number(a.number))
      .slice(0, 5);

    container.innerHTML = "";
    if (!items.length) {
      container.innerHTML = '<div class="text-center py-12 text-slate-400 font-light tracking-wider">現在公開されているお知らせはありません。</div>';
      return;
    }

    items.forEach((item) => {
      const row = makeNewsRow(item);
      if (row) container.appendChild(row);
    });
  } catch (error) {
    console.error(error);
    container.innerHTML = '<div class="text-center py-12 text-slate-400 font-light tracking-wider">最新情報を読み込めませんでした。</div>';
  }
}

document.addEventListener("DOMContentLoaded", renderLatestNews);
