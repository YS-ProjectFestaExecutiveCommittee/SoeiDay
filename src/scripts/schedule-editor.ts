import { initializeApp, getApps, getApp } from "firebase/app";
import {
	getAuth,
	onAuthStateChanged,
	sendPasswordResetEmail,
	signInWithEmailAndPassword,
	signOut,
} from "firebase/auth";
import {
	addDoc,
	collection,
	getFirestore,
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

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
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
const startTime = document.getElementById("start-time");
const endTime = document.getElementById("end-time");
const scheduleTitle = document.getElementById("schedule-title");
const scheduleLocation = document.getElementById("schedule-location");
const scheduleCategory = document.getElementById("schedule-category");
const scheduleDescription = document.getElementById("schedule-description");
const postButton = document.getElementById("post-button");
const postMessage = document.getElementById("post-message");
const currentUser = document.getElementById("current-user");
const logoutButton = document.getElementById("logout-button");
const dayCards = document.querySelectorAll("[data-day-card]");

function setLoginMessage(message, isError = false) {
	loginMessage.textContent = message;
	loginMessage.className = `status-message ${isError ? "text-red-600" : "text-slate-500"}`;
}

function setPostMessage(message, isError = false) {
	postMessage.textContent = message;
	postMessage.className = `status-message ${isError ? "text-red-600" : "text-brand-lime"}`;
}

function setLoading(button, loading, icon, text) {
	button.disabled = loading;
	button.classList.toggle("opacity-60", loading);
	button.classList.toggle("cursor-not-allowed", loading);
	button.innerHTML = loading
		? `<i class="fa-solid fa-spinner fa-spin"></i>${text}中…`
		: `<i class="fa-solid ${icon}"></i>${text}`;
}

function authError(error) {
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
		"処理に失敗しました。Firebase Consoleの設定を確認してください。"
	);
}

function updateDayCards() {
	dayCards.forEach((card) => {
		const radio = card.querySelector("input[type=radio]");
		const dot = card.querySelector(".radio-dot");
		const active = radio.checked;
		card.classList.toggle("active", active);
		dot.className = active
			? "radio-dot mt-1 h-3.5 w-3.5 rounded-full border border-brand-lime bg-brand-lime shrink-0"
			: "radio-dot mt-1 h-3.5 w-3.5 rounded-full border border-slate-300 shrink-0";
	});
}

dayCards.forEach((card) => {
	card.addEventListener("click", () => {
		card.querySelector("input[type=radio]").checked = true;
		updateDayCards();
	});
});

loginForm.addEventListener("submit", async (event) => {
	event.preventDefault();
	setLoginMessage("");
	if (!loginForm.reportValidity()) return;
	setLoading(loginButton, true, "right-to-bracket", "ログイン");
	try {
		await signInWithEmailAndPassword(
			auth,
			loginEmail.value.trim(),
			loginPassword.value,
		);
		loginPassword.value = "";
	} catch (error) {
		console.error(error);
		setLoginMessage(authError(error), true);
	} finally {
		setLoading(loginButton, false, "right-to-bracket", "ログイン");
	}
});

resetButton.addEventListener("click", async () => {
	setLoginMessage("");
	const email = loginEmail.value.trim();
	if (!email || !loginEmail.checkValidity()) {
		setLoginMessage("登録済みのメールアドレスを入力してください。", true);
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
		setLoginMessage("パスワード再設定メールを送信できませんでした。", true);
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
	if (!postForm.reportValidity()) return;
	const day = Number(
		document.querySelector('input[name="schedule-day"]:checked')?.value,
	);
	const start = startTime.value;
	const end = endTime.value;
	if (!day || !start || !end || end <= start) {
		setPostMessage(
			"日程・開始時刻・終了時刻を確認してください。終了時刻は開始時刻より後にしてください。",
			true,
		);
		return;
	}

	setLoading(postButton, true, "calendar-plus", "投稿");
	try {
		await addDoc(collection(db, "schedule"), {
			day,
			startTime: start,
			endTime: end,
			title: scheduleTitle.value.trim(),
			location: scheduleLocation.value.trim(),
			category: scheduleCategory.value.trim(),
			description: scheduleDescription.value.trim(),
			published: true,
			createdAt: serverTimestamp(),
			authorUid: user.uid,
			authorName: user.email || "",
		});

		postForm.reset();
		document.querySelector('input[name="schedule-day"][value="1"]').checked =
			true;
		startTime.value = "09:00";
		endTime.value = "09:30";
		updateDayCards();
		setPostMessage("スケジュールを投稿しました。公開ページに反映されます。");
	} catch (error) {
		console.error(error);
		setPostMessage(
			"投稿に失敗しました。FirestoreのルールとFirebase設定を確認してください。",
			true,
		);
	} finally {
		setLoading(postButton, false, "calendar-plus", "投稿");
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
		currentUser.textContent = `ログイン中：${user.email || "認証済みユーザー"}`;
	} else {
		loginPanel.classList.remove("is-hidden");
		postPanel.classList.add("is-hidden");
		currentUser.textContent = "";
	}
});

updateDayCards();
