import { initializeApp } from "firebase/app";
import {
	getFirestore,
	collection,
	doc,
	getDoc,
	getDocs,
	limit,
	query,
	where,
} from "firebase/firestore/lite";

const firebaseConfig = {
	apiKey: "AIzaSyA5uU-q3FEcElflECG6dc4AckxxX7iKj-s",
	authDomain: "soeiday-b3b5f.firebaseapp.com",
	projectId: "soeiday-b3b5f",
	storageBucket: "soeiday-b3b5f.firebasestorage.app",
	messagingSenderId: "911210293928",
	appId: "1:911210293928:web:8ce217bfe7d5f4d837f09d",
	measurementId: "G-1H9MSJMVQP",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const listView =
	document.getElementById("news-list-view") ||
	document.querySelector("main > section:first-child");
const detailView = document.getElementById("news-detail-view");
const newsReleaseList = document.getElementById("news-release-list");
const topicList = document.getElementById("topic-list");

const detailNumber = document.getElementById("detail-number");
const articleTitle = document.getElementById("article-title");
const articleMeta = document.getElementById("article-meta");
const articleContent = document.getElementById("article-content");
const articleAuthor = document.getElementById("article-author");
const articleImage = document.getElementById("article-image");
const imageWrap = document.getElementById("image-wrap");
const videoWrap = document.getElementById("video-wrap");
const youtubeFrame = document.getElementById("youtube-frame");

const categoryMeta = {
	news_release: { label: "ニュースリリース", className: "text-brand-lime" },
	topic: { label: "トピック", className: "text-brand-orange" },
};

function getMillis(value) {
	if (!value) return 0;
	if (typeof value.toMillis === "function") return value.toMillis();
	const d = new Date(value);
	return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}

function formatDate(value) {
	if (!value) return "";
	const date =
		typeof value.toDate === "function" ? value.toDate() : new Date(value);
	return Number.isNaN(date.getTime())
		? ""
		: new Intl.DateTimeFormat("ja-JP", {
				year: "numeric",
				month: "2-digit",
				day: "2-digit",
			}).format(date);
}

function excerptFromHtml(html, max = 72) {
	const parser = new DOMParser();
	const doc = parser.parseFromString(html || "", "text/html");
	const text = (doc.body.textContent || "").replace(/\s+/g, " ").trim();
	return text.length <= max ? text : `${text.slice(0, max)}…`;
}

function getHashNumber() {
	const raw = window.location.hash.replace(/^#/, "").trim();
	return /^[1-9][0-9]*$/.test(raw) ? Number(raw) : null;
}

function showListView() {
	listView?.classList.remove("is-hidden");
	detailView?.classList.add("is-hidden");
	document.title = "ニュース・お知らせ | 創英祭 2026";
	window.scrollTo({ top: 0, behavior: "auto" });
}

function showDetailView() {
	listView?.classList.add("is-hidden");
	detailView?.classList.remove("is-hidden");
	window.scrollTo({ top: 0, behavior: "auto" });
}

function makeCard(item) {
	const number = Number(item.number);
	if (!Number.isInteger(number) || number < 1) return null;

	const anchor = document.createElement("a");
	anchor.className = "news-card";
	anchor.href = `/news/#${number}`;

	const meta = document.createElement("div");
	meta.className = "news-card__meta";

	const date = document.createElement("time");
	date.className = "news-card__date";
	date.textContent = formatDate(item.createdAt);

	const badge = document.createElement("span");
	const metaInfo = categoryMeta[item.type] || categoryMeta.topic;
	badge.className = `news-card__badge ${metaInfo.className}`;
	badge.textContent = metaInfo.label;
	meta.append(date, badge);

	const title = document.createElement("h3");
	title.className = "news-card__title";
	title.textContent = item.title || "無題の投稿";

	const excerpt = document.createElement("p");
	excerpt.className = "news-card__excerpt";
	excerpt.textContent = excerptFromHtml(item.content);

	const arrow = document.createElement("div");
	arrow.className = "news-card__arrow text-brand-lime";
	arrow.textContent = `#${number}　詳しく見る →`;

	anchor.append(meta, title);
	if (excerpt.textContent) anchor.appendChild(excerpt);
	anchor.appendChild(arrow);
	return anchor;
}

function renderList(container, items, emptyMessage) {
	container.innerHTML = "";
	if (!items.length) {
		const empty = document.createElement("div");
		empty.className = "empty-state";
		empty.textContent = emptyMessage;
		container.appendChild(empty);
		return;
	}
	items.forEach((item) => {
		const card = makeCard(item);
		if (card) container.appendChild(card);
	});
}

async function loadList() {
	const q = query(
		collection(db, "news"),
		where("published", "==", true),
		limit(100),
	);
	const snapshot = await getDocs(q);
	const items = snapshot.docs
		.map((itemDoc) => ({ id: itemDoc.id, ...itemDoc.data() }))
		.filter(
			(item) =>
				Number.isInteger(Number(item.number)) && Number(item.number) > 0,
		)
		.sort((a, b) => Number(b.number) - Number(a.number));

	renderList(
		newsReleaseList,
		items.filter((item) => item.type === "news_release"),
		"現在公開されているニュースリリースはありません。",
	);
	renderList(
		topicList,
		items.filter((item) => item.type === "topic"),
		"現在公開されているトピックはありません。",
	);
}

function sanitizeHtml(html) {
	const parser = new DOMParser();
	const source = parser.parseFromString(html || "", "text/html");
	const allowed = new Set([
		"B",
		"STRONG",
		"U",
		"S",
		"STRIKE",
		"BR",
		"P",
		"DIV",
		"A",
	]);
	const walk = (node) => {
		[...node.childNodes].forEach((child) => {
			if (child.nodeType === Node.ELEMENT_NODE) {
				const el = child;
				if (!allowed.has(el.tagName)) {
					el.replaceWith(...el.childNodes);
					return;
				}
				[...el.attributes].forEach((attr) => el.removeAttribute(attr.name));
				if (el.tagName === "A") {
					const href = child.getAttribute("href") || "";
					if (/^https?:\/\//i.test(href)) {
						el.setAttribute("href", href);
						el.setAttribute("target", "_blank");
						el.setAttribute("rel", "noopener noreferrer");
					} else {
						el.replaceWith(...el.childNodes);
						return;
					}
				}
				walk(el);
			}
		});
	};
	walk(source.body);
	return source.body;
}

function linkifyTextNode(textNode) {
	const text = textNode.nodeValue || "";
	const urlRegex = /(?:https?:\/\/|www\.)[^\s<]+/gi;
	let match;
	let lastIndex = 0;
	const frag = document.createDocumentFragment();
	let found = false;
	while ((match = urlRegex.exec(text))) {
		found = true;
		const start = match.index;
		const rawUrl = match[0];
		const trailing = rawUrl.match(/[.,!?、。）」』】〉》〕\]]+$/u)?.[0] || "";
		const url = trailing ? rawUrl.slice(0, -trailing.length) : rawUrl;
		if (start > lastIndex)
			frag.appendChild(document.createTextNode(text.slice(lastIndex, start)));
		const a = document.createElement("a");
		a.href = /^www\./i.test(url) ? `https://${url}` : url;
		a.target = "_blank";
		a.rel = "noopener noreferrer";
		a.textContent = url;
		frag.appendChild(a);
		if (trailing) frag.appendChild(document.createTextNode(trailing));
		lastIndex = start + rawUrl.length;
	}
	if (!found) return;
	if (lastIndex < text.length)
		frag.appendChild(document.createTextNode(text.slice(lastIndex)));
	textNode.replaceWith(frag);
}

function linkify(container) {
	const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
	const nodes = [];
	while (walker.nextNode()) nodes.push(walker.currentNode);
	nodes.forEach((node) => {
		if (node.parentElement?.closest("a")) return;
		linkifyTextNode(node);
	});
}

function renderContent(html) {
	articleContent.innerHTML = "";
	const clean = sanitizeHtml(html);
	articleContent.append(...clean.childNodes);
	linkify(articleContent);
}

function safeYouTubeEmbed(videoId) {
	return /^[A-Za-z0-9_-]{11}$/.test(videoId || "")
		? `https://www.youtube.com/embed/${videoId}`
		: "";
}

function resetDetail() {
	articleMeta.innerHTML = "";
	articleContent.innerHTML = "";
	articleAuthor.textContent = "";
	detailNumber.textContent = "";
	imageWrap.classList.add("hidden");
	videoWrap.classList.add("hidden");
	articleImage.removeAttribute("src");
	youtubeFrame.removeAttribute("src");
}

async function loadDetail(number) {
	resetDetail();
	showDetailView();
	articleTitle.textContent = "読み込み中…";

	if (!number) {
		throw new Error("記事番号がありません。");
	}

	const snapshot = await getDoc(doc(db, "news", String(number)));
	if (!snapshot.exists()) throw new Error("記事が見つかりません。");
	const item = snapshot.data();
	if (item.published !== true)
		throw new Error("この記事は公開されていません。");

	const meta = categoryMeta[item.type] || categoryMeta.topic;
	const title = item.title || "無題の投稿";
	const date = formatDate(item.createdAt);

	document.title = `${title} | 創英祭 2026`;
	articleTitle.textContent = title;
	detailNumber.textContent = `NEWS #${Number(item.number)}`;

	const badge = document.createElement("span");
	badge.className = `meta-label ${meta.className}`;
	badge.textContent = meta.label;
	articleMeta.appendChild(badge);

	if (date) {
		const time = document.createElement("time");
		time.className = "text-xs text-slate-500 font-sans tracking-[0.1em]";
		time.textContent = date;
		articleMeta.appendChild(time);
	}

	renderContent(item.content || "");

	if (
		item.imageData &&
		/^data:image\/(jpeg|jpg|webp|png);base64,/i.test(item.imageData)
	) {
		articleImage.src = item.imageData;
		articleImage.alt = title;
		imageWrap.classList.remove("hidden");
	}

	const embed = safeYouTubeEmbed(item.youtubeId);
	if (embed) {
		youtubeFrame.src = embed;
		videoWrap.classList.remove("hidden");
	}

	articleAuthor.textContent = item.authorName
		? `投稿者：${item.authorName}`
		: "";
}

async function routeByHash() {
	const number = getHashNumber();
	if (!number) {
		resetDetail();
		showListView();
		return;
	}
	try {
		await loadDetail(number);
	} catch (error) {
		console.error(error);
		showDetailView();
		document.title = "記事が見つかりません | 創英祭 2026";
		detailNumber.textContent = "";
		articleTitle.textContent = "この記事は存在しないか、公開を終了しています。";
		articleContent.textContent =
			"ニュース一覧に戻って、別の記事をお選びください。";
		articleAuthor.textContent = "";
	}
}

window.addEventListener("hashchange", routeByHash);

try {
	await loadList();
} catch (error) {
	console.error(error);
	newsReleaseList.innerHTML =
		'<div class="empty-state">ニュースを読み込めませんでした。Firebaseの設定とFirestoreルールを確認してください。</div>';
	topicList.innerHTML =
		'<div class="empty-state">ニュースを読み込めませんでした。Firebaseの設定とFirestoreルールを確認してください。</div>';
}

await routeByHash();
