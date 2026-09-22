(() => {
	const grid = document.getElementById("mini-game-grid");
	const startButton = document.getElementById("game-start");
	const timeEl = document.getElementById("game-time");
	const scoreEl = document.getElementById("game-score");
	const bestEl = document.getElementById("game-best");
	const messageEl = document.getElementById("game-message");
	const cellCount = 12;
	const gameLength = 15;
	let score = 0;
	let timeLeft = gameLength;
	let targetIndex = -1;
	let timerId = null;
	let active = false;
	const getBest = () =>
		Number(localStorage.getItem("soei-underconstruction-best") || 0);
	bestEl.textContent = getBest();
	function renderCells() {
		grid.innerHTML = "";
		for (let i = 0; i < cellCount; i += 1) {
			const button = document.createElement("button");
			button.type = "button";
			button.className = "mini-game-cell";
			button.textContent = "・";
			button.dataset.index = String(i);
			button.disabled = !active;
			button.addEventListener("click", () => {
				if (!active) return;
				if (i === targetIndex) {
					score += 1;
					scoreEl.textContent = score;
					nextRound();
				} else {
					timeLeft = Math.max(0, timeLeft - 1);
					timeEl.textContent = timeLeft;
					button.textContent = "×";
					button.classList.add("opacity-60");
					if (timeLeft <= 0) endGame();
				}
			});
			grid.appendChild(button);
		}
	}
	function nextRound() {
		const cells = [...grid.children];
		cells.forEach((cell) => {
			cell.classList.remove("target");
			cell.textContent = "・";
		});
		targetIndex = Math.floor(Math.random() * cells.length);
		cells[targetIndex].classList.add("target");
		cells[targetIndex].textContent = "繋";
	}
	function endGame() {
		active = false;
		clearInterval(timerId);
		timerId = null;
		[...grid.children].forEach((cell) => {
			cell.disabled = true;
		});
		const best = getBest();
		if (score > best) {
			localStorage.setItem("soei-underconstruction-best", String(score));
			bestEl.textContent = score;
			messageEl.textContent = `ゲーム終了！ ${score}回発見。自己ベスト更新です。`;
		} else {
			messageEl.textContent = `ゲーム終了！ ${score}回発見しました。もう一度挑戦できます。`;
		}
		startButton.innerHTML = '<i class="fa-solid fa-rotate-right"></i> もう一度';
	}
	function startGame() {
		clearInterval(timerId);
		score = 0;
		timeLeft = gameLength;
		active = true;
		scoreEl.textContent = "0";
		timeEl.textContent = String(gameLength);
		messageEl.textContent = "「繋」を見つけたらすぐクリック！";
		startButton.innerHTML = '<i class="fa-solid fa-bolt"></i> プレイ中';
		renderCells();
		nextRound();
		timerId = setInterval(() => {
			timeLeft -= 1;
			timeEl.textContent = timeLeft;
			if (timeLeft <= 0) endGame();
		}, 1000);
	}
	startButton.addEventListener("click", startGame);
	renderCells();
})();
