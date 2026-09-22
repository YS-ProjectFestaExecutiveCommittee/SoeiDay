import { initializeApp } from "firebase/app";
import {
	getAuth,
	onAuthStateChanged,
	sendPasswordResetEmail,
	signInWithEmailAndPassword,
	signOut,
} from "firebase/auth";
import {
	doc,
	getFirestore,
	runTransaction,
	serverTimestamp,
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
const auth = getAuth(app);
const db = getFirestore(app);

const loginPanel = document.getElementById("login-panel");
const postPanel = document.getElementById("post-panel");
const loginForm = document.getElementById("login-form");
const loginEmail = document.getElementById("login-email");
const loginPassword = document.getElementById("login-password");
const loginButton = document.getElementById("login-button");
const resetButton = document.getElementById("reset-button");
const loginMessage = document.getElementById("login-message");
const postForm = document.getElementById("post-form");
const postTitle = document.getElementById("post-title");
const postAuthor = document.getElementById("post-author");
const postContent = document.getElementById("post-content");
const postImage = document.getElementById("post-image");
const imagePreviewWrap = document.getElementById("image-preview-wrap");
const imagePreview = document.getElementById("image-preview");
const imageSizeText = document.getElementById("image-size-text");
const imageClearButton = document.getElementById("image-clear-button");
const postYoutube = document.getElementById("post-youtube");
const youtubeMessage = document.getElementById("youtube-message");
const postButton = document.getElementById("post-button");
const postMessage = document.getElementById("post-message");
const currentUserText = document.getElementById("current-user");
const logoutButton = document.getElementById("logout-button");
const categoryCards = document.querySelectorAll("[data-category-card]");

let imageData = "";

function setButtonLoading(button, loading, loadingText, normalText, iconClass) {
	button.disabled = loading;
	button.innerHTML = loading
		? `<i class="fa-solid fa-spinner fa-spin"></i>${loadingText}`
		: `<i class="fa-solid ${iconClass}"></i>${normalText}`;
	button.classList.toggle("opacity-60", loading);
	button.classList.toggle("cursor-not-allowed", loading);
}

function getFirebaseErrorMessage(error) {
	const map = {
		"auth/invalid-credential":
			"メールアドレスまたはパスワードが正しくありません。",
		"auth/invalid-email": "メールアドレスの形式を確認してください。",
		"auth/too-many-requests":
			"試行回数が多いため、一時的にログインを制限しています。時間を置いて再度お試しください。",
		"auth/user-disabled": "このユーザーは無効化されています。",
		"auth/network-request-failed": "ネットワーク接続を確認してください。",
	};
	return (
		map[error?.code] ||
		"処理に失敗しました。Firebase Consoleの設定も確認してください。"
	);
}

function setLoginMessage(message, isError = false) {
	loginMessage.textContent = message;
	loginMessage.className = `status-message ${isError ? "text-red-600" : "text-slate-500"}`;
}

function setPostMessage(message, isError = false) {
	postMessage.textContent = message;
	postMessage.className = `status-message ${isError ? "text-red-600" : "text-brand-lime"}`;
}

function updateCategoryCards() {
	categoryCards.forEach((card) => {
		const radio = card.querySelector('input[type="radio"]');
		const dot = card.querySelector(".radio-dot");
		card.classList.toggle("active", radio.checked);
		dot.className = radio.checked
			? "radio-dot mt-1 h-3.5 w-3.5 rounded-full border border-brand-lime bg-brand-lime shrink-0"
			: "radio-dot mt-1 h-3.5 w-3.5 rounded-full border border-slate-300 shrink-0";
	});
}

categoryCards.forEach((card) =>
	card.addEventListener("click", () => {
		card.querySelector('input[type="radio"]').checked = true;
		updateCategoryCards();
	}),
);

document.querySelectorAll("[data-command]").forEach((button) => {
	button.addEventListener("mousedown", (event) => event.preventDefault());
	button.addEventListener("click", () => {
		postContent.focus();
		document.execCommand(button.dataset.command, false, null);
	});
});

function sanitizeEditorHtml(html) {
	const parser = new DOMParser();
	const doc = parser.parseFromString(html || "", "text/html");
	const allowed = new Set([
		"B",
		"STRONG",
		"U",
		"S",
		"STRIKE",
		"BR",
		"P",
		"DIV",
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
				walk(el);
			}
		});
	};
	walk(doc.body);
	return doc.body.innerHTML.trim();
}

function extractYouTubeId(input) {
	const value = (input || "").trim();
	if (!value) return "";
	let url;
	try {
		url = new URL(value);
	} catch {
		return "";
	}
	const host = url.hostname.toLowerCase().replace(/^www\./, "");
	if (host === "youtu.be")
		return (url.pathname.split("/").filter(Boolean)[0] || "").slice(0, 11);
	if (host === "youtube.com" || host === "m.youtube.com") {
		if (url.pathname === "/watch") return url.searchParams.get("v") || "";
		if (url.pathname.startsWith("/shorts/"))
			return url.pathname.split("/")[2] || "";
		if (url.pathname.startsWith("/embed/"))
			return url.pathname.split("/")[2] || "";
	}
	return "";
}

function validateYouTube() {
	const raw = postYoutube.value.trim();
	if (!raw) {
		youtubeMessage.textContent = "YouTube動画（任意）。";
		youtubeMessage.className = "help-text mt-2";
		return true;
	}
	const id = extractYouTubeId(raw);
	if (!/^[A-Za-z0-9_-]{11}$/.test(id)) {
		youtubeMessage.textContent =
			"YouTubeのURLとして認識できません。通常URL・youtu.be・Shorts・embed URLを確認してください。";
		youtubeMessage.className = "help-text mt-2 youtube-ng";
		return false;
	}
	youtubeMessage.textContent = "YouTube動画として認識しました。";
	youtubeMessage.className = "help-text mt-2 youtube-ok";
	return true;
}

postYoutube.addEventListener("input", validateYouTube);

function readFileAsDataURL(file) {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result);
		reader.onerror = reject;
		reader.readAsDataURL(file);
	});
}

function imageElementFromDataURL(dataUrl) {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.onload = () => resolve(img);
		img.onerror = reject;
		img.src = dataUrl;
	});
}

async function compressImage(file) {
	if (!file.type.startsWith("image/"))
		throw new Error("画像ファイルを選択してください。");
	const originalDataUrl = await readFileAsDataURL(file);
	const img = await imageElementFromDataURL(originalDataUrl);

	const maxSide = 600;
	const scale = Math.min(
		1,
		maxSide / Math.max(img.naturalWidth, img.naturalHeight),
	);
	const width = Math.max(1, Math.round(img.naturalWidth * scale));
	const height = Math.max(1, Math.round(img.naturalHeight * scale));

	const canvas = document.createElement("canvas");
	canvas.width = width;
	canvas.height = height;
	const ctx = canvas.getContext("2d", { alpha: false });
	if (!ctx) throw new Error("画像処理を開始できませんでした。");
	ctx.fillStyle = "#ffffff";
	ctx.fillRect(0, 0, width, height);
	ctx.drawImage(img, 0, 0, width, height);

	const qualityCandidates = [0.84, 0.76, 0.68, 0.6, 0.52, 0.44];
	let result = "";
	for (const quality of qualityCandidates) {
		result = canvas.toDataURL("image/jpeg", quality);
		if (result.length <= 700000) break;
	}

	if (result.length > 700000) {
		throw new Error(
			"画像を十分に圧縮できませんでした。別の画像をお試しください。",
		);
	}

	return {
		dataUrl: result,
		width,
		height,
		bytes: Math.round((result.length * 3) / 4),
	};
}

postImage.addEventListener("change", async () => {
	const file = postImage.files?.[0];
	imageData = "";
	imagePreviewWrap.classList.add("hidden");
	if (!file) return;

	try {
		const result = await compressImage(file);
		imageData = result.dataUrl;
		imagePreview.src = imageData;
		imagePreviewWrap.classList.remove("hidden");
		const kb = Math.max(1, Math.round(result.dataUrl.length / 1024));
		imageSizeText.textContent = `${result.width} × ${result.height}px / Base64データ約${kb}KB`;
	} catch (error) {
		console.error(error);
		postImage.value = "";
		setPostMessage(error.message || "画像処理に失敗しました。", true);
	}
});

imageClearButton.addEventListener("click", () => {
	postImage.value = "";
	imageData = "";
	imagePreview.src = "";
	imagePreviewWrap.classList.add("hidden");
	imageSizeText.textContent = "";
});

loginForm.addEventListener("submit", async (event) => {
	event.preventDefault();
	setLoginMessage("");
	if (!loginForm.reportValidity()) return;
	setButtonLoading(
		loginButton,
		true,
		"ログイン中…",
		"ログイン",
		"right-to-bracket",
	);
	try {
		await signInWithEmailAndPassword(
			auth,
			loginEmail.value.trim(),
			loginPassword.value,
		);
		loginPassword.value = "";
	} catch (error) {
		console.error(error);
		setLoginMessage(getFirebaseErrorMessage(error), true);
	} finally {
		setButtonLoading(loginButton, false, "", "ログイン", "right-to-bracket");
	}
});

resetButton.addEventListener("click", async () => {
	setLoginMessage("");
	const email = loginEmail.value.trim();
	if (!email || !loginEmail.checkValidity()) {
		setLoginMessage(
			"パスワード再設定メールを送る有効なメールアドレスを入力してください。",
			true,
		);
		loginEmail.focus();
		return;
	}
	try {
		await sendPasswordResetEmail(auth, email);
		setLoginMessage(
			"パスワード再設定メールを送信しました。受信トレイをご確認ください。",
		);
	} catch (error) {
		console.error(error);
		setLoginMessage(
			"パスワード再設定メールの送信に失敗しました。登録済みアドレスか確認してください。",
			true,
		);
	}
});

postForm.addEventListener("submit", async (event) => {
	event.preventDefault();
	setPostMessage("");
	const user = auth.currentUser;
	if (!user) {
		setPostMessage(
			"認証状態を確認できません。もう一度ログインしてください。",
			true,
		);
		return;
	}
	if (!validateYouTube() || !postForm.reportValidity()) return;

	const type = document.querySelector('input[name="post-type"]:checked')?.value;
	const title = postTitle.value.trim();
	const authorName = postAuthor.value.trim();
	const content = sanitizeEditorHtml(postContent.innerHTML);
	const youtubeId = extractYouTubeId(postYoutube.value);

	if (!content || content.replace(/<[^>]*>/g, "").trim() === "") {
		setPostMessage("本文を入力してください。", true);
		postContent.focus();
		return;
	}

	if (imageData.length > 700000) {
		setPostMessage(
			"画像データが大きすぎます。画像を選び直してください。",
			true,
		);
		return;
	}

	setButtonLoading(postButton, true, "投稿中…", "投稿する", "paper-plane");
	try {
		const counterRef = doc(db, "meta", "newsCounter");
		const result = await runTransaction(db, async (transaction) => {
			const counterSnapshot = await transaction.get(counterRef);
			const lastNumber = counterSnapshot.exists()
				? Number(counterSnapshot.data()?.lastNumber || 0)
				: 0;
			const nextNumber = lastNumber + 1;
			const newsRef = doc(db, "news", String(nextNumber));

			transaction.set(counterRef, { lastNumber: nextNumber });
			transaction.set(newsRef, {
				number: nextNumber,
				type,
				title,
				content,
				imageData: imageData || "",
				youtubeId: youtubeId || "",
				authorName,
				published: true,
				createdAt: serverTimestamp(),
				authorUid: user.uid,
			});

			return nextNumber;
		});

		postForm.reset();
		postContent.innerHTML = "";
		imageData = "";
		imagePreviewWrap.classList.add("hidden");
		imagePreview.src = "";
		updateCategoryCards();
		validateYouTube();
		setPostMessage(`投稿しました。公開URLは /news/#${result} です。`);
	} catch (error) {
		console.error(error);
		const message =
			error?.code === "permission-denied"
				? "投稿に失敗しました。番号採番用のFirestoreルールが未反映か、認証状態を確認してください。"
				: "投稿に失敗しました。FirebaseとFirestoreの設定を確認してください。";
		setPostMessage(message, true);
	} finally {
		setButtonLoading(postButton, false, "", "投稿する", "paper-plane");
	}
});

logoutButton.addEventListener("click", async () => {
	try {
		await signOut(auth);
	} catch (error) {
		console.error(error);
		setPostMessage("ログアウトに失敗しました。", true);
	}
});

onAuthStateChanged(auth, (user) => {
	if (user) {
		loginPanel.classList.add("is-hidden");
		postPanel.classList.remove("is-hidden");
		currentUserText.textContent = `ログイン中：${user.email || "認証済みユーザー"}`;
		setLoginMessage("");
	} else {
		loginPanel.classList.remove("is-hidden");
		postPanel.classList.add("is-hidden");
		currentUserText.textContent = "";
	}
});

updateCategoryCards();
validateYouTube();
