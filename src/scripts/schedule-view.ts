import { initializeApp, getApps, getApp } from "firebase/app";
import {
	getFirestore,
	collection,
	getDocs,
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

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);

const DAY_INFO = {
	1: { label: "1日目", date: "10/3 Sat" },
	2: { label: "2日目", date: "10/4 Sun" },
};

const state = { items: [], activeDay: 1 };

const els = {
	loading: document.getElementById("loading-indicator"),
	wrapper: document.getElementById("timetable-wrapper"),
	timeColumn: document.getElementById("time-column"),
	timeBody: document.getElementById("time-body"),
	gridColumn: document.getElementById("grid-column"),
	locationHeader: document.getElementById("location-header"),
	gridBody: document.getElementById("grid-body"),
	tab1: document.getElementById("tab-day1"),
	tab2: document.getElementById("tab-day2"),
	modal: document.getElementById("event-modal"),
	modalPanel: document.getElementById("event-modal-panel"),
	modalTime: document.getElementById("modal-time"),
	modalCategory: document.getElementById("modal-category"),
	modalTitle: document.getElementById("modal-title"),
	modalLocation: document.getElementById("modal-location"),
	modalDescription: document.getElementById("modal-description"),
};

function escapeText(value) {
	return String(value ?? "");
}

function timeToMinutes(value) {
	const match = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(String(value || ""));
	if (!match) return null;
	return Number(match[1]) * 60 + Number(match[2]);
}

function minutesToLabel(minutes) {
	const h = Math.floor(minutes / 60)
		.toString()
		.padStart(2, "0");
	const m = (minutes % 60).toString().padStart(2, "0");
	return `${h}:${m}`;
}

function colorClass(category) {
	const text = String(category || "").toLowerCase();
	return /stage|ステージ|演目|発表/.test(text)
		? "schedule-event-orange"
		: "schedule-event-lime";
}

function normalizeItem(doc) {
	const data = doc.data();
	const day = Number(data.day);
	const start = timeToMinutes(data.startTime);
	const end = timeToMinutes(data.endTime);
	if (![1, 2].includes(day) || start === null || end === null || end <= start)
		return null;
	return { id: doc.id, ...data, day, startMinutes: start, endMinutes: end };
}

function openModal(item) {
	els.modalTime.textContent = `${DAY_INFO[item.day].label} ${item.startTime}–${item.endTime}`;
	els.modalCategory.textContent = item.category || "EVENT";
	els.modalTitle.textContent = item.title || "無題のイベント";
	els.modalLocation.textContent = item.location ? `会場：${item.location}` : "";
	els.modalDescription.textContent =
		item.description || "詳細情報はありません。";
	els.modal.classList.remove("modal-hidden");
	els.modal.classList.add("modal-visible");
	els.modalPanel.classList.remove("modal-panel-hidden");
	els.modalPanel.classList.add("modal-panel-visible");
	els.modal.setAttribute("aria-hidden", "false");
	document.body.classList.add("overflow-hidden");
}

function closeModal() {
	els.modal.classList.add("modal-hidden");
	els.modal.classList.remove("modal-visible");
	els.modalPanel.classList.add("modal-panel-hidden");
	els.modalPanel.classList.remove("modal-panel-visible");
	els.modal.setAttribute("aria-hidden", "true");
	document.body.classList.remove("overflow-hidden");
}

function setActiveDay(day) {
	state.activeDay = day;
	[els.tab1, els.tab2].forEach((tab, index) => {
		const active = day === index + 1;
		tab.classList.toggle("active", active);
		tab.classList.toggle("border-brand-orange", active);
		tab.classList.toggle("text-brand-orange", active);

		tab.classList.toggle("border-transparent", !active);
		tab.classList.toggle("text-slate-500", !active);
	});
	renderDay(day);
}

function renderDay(day) {
	const items = state.items.filter((item) => item.day === day);

	els.timeBody.innerHTML = "";
	els.locationHeader.innerHTML = "";
	els.gridBody.innerHTML = "";

	const start = 9 * 60 + 30;
	const end = 15 * 60;
	const visibleItems = items.filter(
		(item) => item.endMinutes > start && item.startMinutes < end,
	);

	if (!visibleItems.length) {
		const height = 420;
		els.timeBody.style.height = `${height}px`;
		els.gridBody.style.height = `${height}px`;
		const empty = document.createElement("div");
		empty.className = "schedule-empty";
		empty.textContent =
			"この日の9:30〜15:00のスケジュールはまだ登録されていません。";
		els.gridBody.style.gridTemplateColumns = "1fr";
		els.gridBody.appendChild(empty);
		els.wrapper.classList.remove("hidden");
		return;
	}

	const totalMinutes = end - start;
	const rowHeight = 52;
	const height = (totalMinutes / 30) * rowHeight;

	els.timeBody.style.height = `${height}px`;
	els.gridBody.style.height = `${height}px`;

	const locationMap = new Map();
	visibleItems.forEach((item) => {
		const key = String(item.location || "").trim() || "会場未設定";
		if (!locationMap.has(key)) locationMap.set(key, []);
		locationMap.get(key).push(item);
	});

	const locations = Array.from(locationMap.keys());
	els.locationHeader.style.gridTemplateColumns = `repeat(${locations.length}, minmax(0, 1fr))`;
	els.gridBody.style.gridTemplateColumns = `repeat(${locations.length}, minmax(0, 1fr))`;

	locations.forEach((location) => {
		const headerCell = document.createElement("div");
		headerCell.className = "schedule-location-header-cell";
		headerCell.textContent = location;
		headerCell.title = location;
		els.locationHeader.appendChild(headerCell);
	});

	for (let minute = start; minute <= end; minute += 30) {
		const ratio = (minute - start) / totalMinutes;
		const label = document.createElement("div");
		label.className = "schedule-time";
		label.style.top = `${ratio * 100}%`;
		label.textContent = minutesToLabel(minute);
		els.timeBody.appendChild(label);
	}

	const laneGap = 4;
	const minEventHeight = 46;

	locations.forEach((location) => {
		const column = document.createElement("div");
		column.className = "schedule-location-column";
		column.style.height = `${height}px`;
		els.gridBody.appendChild(column);

		const lines = document.createElement("div");
		lines.className = "schedule-grid-lines";
		column.appendChild(lines);

		for (let minute = start; minute <= end; minute += 30) {
			const ratio = (minute - start) / totalMinutes;
			const line = document.createElement("div");
			line.className =
				minute % 60 === 0 ? "schedule-hour-line" : "schedule-half-line";
			line.style.top = `${ratio * 100}%`;
			lines.appendChild(line);
		}

		const events = locationMap
			.get(location)
			.slice()
			.sort(
				(a, b) =>
					a.startMinutes - b.startMinutes ||
					a.endMinutes - b.endMinutes ||
					a.title.localeCompare(b.title, "ja"),
			);

		const lanes = [];

		events.forEach((item) => {
			const visibleStart = Math.max(item.startMinutes, start);
			const visibleEnd = Math.min(item.endMinutes, end);
			const topPx = ((visibleStart - start) / totalMinutes) * height;
			const naturalHeightPx =
				((visibleEnd - visibleStart) / totalMinutes) * height;
			const heightPx = Math.min(
				Math.max(minEventHeight, naturalHeightPx),
				Math.max(0, height - topPx),
			);
			const bottomPx = topPx + heightPx;

			let lane = 0;
			while (
				lanes[lane]?.some((existing) => existing.bottomPx + laneGap > topPx)
			) {
				lane += 1;
			}

			if (!lanes[lane]) lanes[lane] = [];
			lanes[lane].push({ item, topPx, bottomPx });
			item.__lane = lane;
			item.__topPx = topPx;
			item.__heightPx = heightPx;
		});

		const laneCount = Math.max(lanes.length, 1);
		const laneWidth = 100 / laneCount;

		events.forEach((item) => {
			const event = document.createElement("button");
			event.type = "button";
			event.className = `schedule-event ${colorClass(item.category)} text-left`;
			event.style.top = `${item.__topPx}px`;
			event.style.height = `${item.__heightPx}px`;
			event.style.left = `calc(${item.__lane * laneWidth}% + 6px)`;
			event.style.width = `calc(${laneWidth}% - 12px)`;
			event.innerHTML = `
            <div class="schedule-event-title">${escapeText(item.title)}</div>
            <div class="schedule-event-meta">${escapeText(item.startTime)}–${escapeText(item.endTime)}${item.location ? ` ・ ${escapeText(item.location)}` : ""}</div>
          `;
			event.addEventListener("click", () => openModal(item));
			column.appendChild(event);
		});
	});

	els.wrapper.classList.remove("hidden");
}

async function loadSchedule() {
	try {
		const q = query(collection(db, "schedule"), where("published", "==", true));
		const snapshot = await getDocs(q);
		state.items = snapshot.docs.map(normalizeItem).filter(Boolean);
		state.items.sort(
			(a, b) =>
				a.day - b.day ||
				a.startMinutes - b.startMinutes ||
				a.title.localeCompare(b.title, "ja"),
		);
		els.loading.classList.add("hidden");
		setActiveDay(1);
	} catch (error) {
		console.error("スケジュール取得エラー:", error);
		els.loading.innerHTML =
			"スケジュールを読み込めませんでした。Firebaseの設定とFirestoreルールを確認してください。";
		els.wrapper.classList.add("hidden");
	}
}

els.tab1.addEventListener("click", () => setActiveDay(1));
els.tab2.addEventListener("click", () => setActiveDay(2));
document
	.getElementById("event-modal-close")
	.addEventListener("click", closeModal);
document
	.querySelector("[data-close-modal]")
	.addEventListener("click", closeModal);
document.addEventListener("keydown", (event) => {
	if (event.key === "Escape") closeModal();
});

loadSchedule();
