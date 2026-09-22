const FLOOR_TITLES = {
	h1: "本館 1F",
	h2: "本館 2F",
	h3: "本館 3F / 新館 B1F",
	s1: "本館 4F / 新館 1F / 体育館",
	s2: "新館 2F",
	s3: "新館 3F",
};

const BLUEPRINT_LOADERS = {
 h1: () => import("./map-main-1f").then((module) => module.default),
 h2: () => import("./map-main-2f").then((module) => module.default),
 h3: () => import("./map-main-3f").then((module) => module.default),
 s1: () => import("./map-special-1f").then((module) => module.default),
 s2: () => import("./map-special-2f").then((module) => module.default),
 s3: () => import("./map-special-3f").then((module) => module.default),
};

export { FLOOR_TITLES };

function escapeHtml(value) {
	return String(value ?? "")
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#39;");
}

function extractBalancedJson(text, start) {
	const opening = text[start];
	const closing = opening === "{" ? "}" : "]";
	let depth = 0;
	let inString = false;
	let escaped = false;

	for (let i = start; i < text.length; i += 1) {
		const ch = text[i];
		if (inString) {
			if (escaped) escaped = false;
			else if (ch === "\\") escaped = true;
			else if (ch === '"') inString = false;
			continue;
		}
		if (ch === '"') {
			inString = true;
			continue;
		}
		if (ch === opening) depth += 1;
		if (ch === closing) depth -= 1;
		if (depth === 0) return text.slice(start, i + 1);
	}
	throw new Error("フロア図データのJSON終端を検出できませんでした。");
}

async function fetchBlueprintData(floorKey) {
 const loader = BLUEPRINT_LOADERS[floorKey];
 if (!loader) throw new Error(`Blueprint data not found for ${floorKey}`);
 return loader();
}

function normalizeBlueprintPaths(mapDataObj, floorKey) {
	if (Array.isArray(mapDataObj)) return mapDataObj;
	if (!mapDataObj || typeof mapDataObj !== "object") return null;

	const patterns = {
		h1: ["h1", "本館1", "本館 1"],
		h2: ["h2", "本館2", "本館 2"],
		h3: ["h3", "本館3", "本館 3", "新館b1", "新館 b1"],
		s1: ["s1", "新館1", "新館 1", "本館4", "本館 4", "体育館"],
		s2: ["s2", "新館2", "新館 2"],
		s3: ["s3", "新館3", "新館 3"],
	};

	if (Array.isArray(mapDataObj.paths)) return mapDataObj.paths;
	if (Array.isArray(mapDataObj.elements)) return mapDataObj.elements;
	if (Array.isArray(mapDataObj.items)) return mapDataObj.items;

	const wanted = patterns[floorKey] || [floorKey];
	for (const [key, value] of Object.entries(mapDataObj)) {
		if (
			Array.isArray(value) &&
			wanted.some((pattern) =>
				key.toLowerCase().includes(pattern.toLowerCase()),
			)
		)
			return value;
	}
	return Object.values(mapDataObj).find(Array.isArray) || null;
}

function calculateViewBox(items) {
	let minX = Infinity,
		minY = Infinity,
		maxX = -Infinity,
		maxY = -Infinity;
	for (const item of items) {
		const attrs = item?.attributes || {};
		if (typeof attrs.d !== "string") continue;
		const numbers = attrs.d.match(/-?\d+(?:\.\d+)?/g)?.map(Number) || [];
		for (let i = 0; i + 1 < numbers.length; i += 2) {
			minX = Math.min(minX, numbers[i]);
			maxX = Math.max(maxX, numbers[i]);
			minY = Math.min(minY, numbers[i + 1]);
			maxY = Math.max(maxY, numbers[i + 1]);
		}
	}
	if (!Number.isFinite(minX)) return "0 0 5000 2000";
	const padX = (maxX - minX) * 0.05 || 50;
	const padY = (maxY - minY) * 0.05 || 50;
	return `${Math.max(0, minX - padX)} ${Math.max(0, minY - padY)} ${maxX - minX + padX * 2} ${maxY - minY + padY * 2}`;
}

function renderBlueprintPaths(target, mapDataObj, floorKey) {
	const items = normalizeBlueprintPaths(mapDataObj, floorKey);
	if (!Array.isArray(items))
		throw new Error("フロア図の配列データを確認できませんでした。");

	const pathsHtml = items
		.map((item) => {
			const attrs = Object.entries(item?.attributes || {})
				.map(([key, value]) => `${escapeHtml(key)}="${escapeHtml(value)}"`)
				.join(" ");
			const tagName = item?.type || "path";
			const safeTag = [
				"path",
				"rect",
				"line",
				"polyline",
				"polygon",
				"circle",
				"ellipse",
				"text",
			].includes(tagName)
				? tagName
				: "path";
			return `<${safeTag} id="${escapeHtml(item?.id || "")}" ${attrs}></${safeTag}>`;
		})
		.join("");

	const viewBox = calculateViewBox(items);

	target.innerHTML = `
    <div id="map-click-surface" class="relative w-full h-full flex items-center justify-center p-2">
      <svg viewBox="${viewBox}" class="w-full h-full max-h-[600px] drop-shadow-sm pointer-events-none" preserveAspectRatio="xMidYMid meet" aria-label="${escapeHtml(FLOOR_TITLES[floorKey] || "フロアマップ")}">
        ${pathsHtml}
      </svg>
      <div id="pins-layer" class="absolute inset-0 pointer-events-auto"></div>
    </div>
  `;
}

export async function renderBlueprint(target, floorKey) {
	target.innerHTML =
		'<div class="text-center text-slate-400 font-light py-16"><i class="fa-solid fa-spinner fa-spin text-2xl mb-3 block"></i>マップを読み込んでいます...</div>';
	const data = await fetchBlueprintData(floorKey);
	const shell = document.createElement("div");
	shell.className =
		"w-full h-full relative flex items-center justify-center min-h-[420px] bg-white border border-dashed border-gray-300 p-4 rounded-sm";
	target.innerHTML = "";
	target.appendChild(shell);
	renderBlueprintPaths(shell, data, floorKey);
	return shell;
}

export function getBlueprintSvg(container) {
	return container?.querySelector?.("svg") || null;
}

function clampPercent(value) {
	return Math.max(0, Math.min(100, value));
}

export function normalizePercent(value) {
	const number = Number.parseFloat(String(value ?? "").replace("%", ""));
	if (!Number.isFinite(number)) return null;
	return `${clampPercent(number).toFixed(2).replace(/\.00$/, "")}%`;
}

export function positionElementFromPercent(element, layer, svg, posX, posY) {
	const x = Number.parseFloat(String(posX ?? "").replace("%", ""));
	const y = Number.parseFloat(String(posY ?? "").replace("%", ""));
	if (
		!Number.isFinite(x) ||
		!Number.isFinite(y) ||
		!svg ||
		!layer ||
		!svg.viewBox?.baseVal ||
		typeof svg.getScreenCTM !== "function"
	) {
		element.style.left = `${Number.isFinite(x) ? clampPercent(x) : 50}%`;
		element.style.top = `${Number.isFinite(y) ? clampPercent(y) : 50}%`;
		return;
	}

	const ctm = svg.getScreenCTM();
	const viewBox = svg.viewBox.baseVal;
	if (!ctm || !viewBox.width || !viewBox.height) {
		element.style.left = `${clampPercent(x)}%`;
		element.style.top = `${clampPercent(y)}%`;
		return;
	}

	const point = svg.createSVGPoint();
	point.x = viewBox.x + (viewBox.width * clampPercent(x)) / 100;
	point.y = viewBox.y + (viewBox.height * clampPercent(y)) / 100;
	const screenPoint = point.matrixTransform(ctm);
	const layerRect = layer.getBoundingClientRect();
	element.style.left = `${screenPoint.x - layerRect.left}px`;
	element.style.top = `${screenPoint.y - layerRect.top}px`;
}

export function percentFromPointerEvent(event, svg) {
	if (!svg || !svg.viewBox?.baseVal || typeof svg.getScreenCTM !== "function")
		return null;
	const ctm = svg.getScreenCTM();
	if (!ctm) return null;
	const point = svg.createSVGPoint();
	point.x = event.clientX;
	point.y = event.clientY;
	const local = point.matrixTransform(ctm.inverse());
	const viewBox = svg.viewBox.baseVal;
	if (!viewBox.width || !viewBox.height) return null;
	const x = clampPercent(((local.x - viewBox.x) / viewBox.width) * 100);
	const y = clampPercent(((local.y - viewBox.y) / viewBox.height) * 100);
	return { x: `${x.toFixed(2)}%`, y: `${y.toFixed(2)}%` };
}

export function addResizeRepositionListener(callback) {
	window.addEventListener("resize", () => requestAnimationFrame(callback), {
		passive: true,
	});
}
