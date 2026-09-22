const initSiteInteractions = () => {
	const mobileButton = document.getElementById("mobile-menu-btn");
	const mobileMenu = document.getElementById("mobile-menu");

	if (mobileButton && mobileMenu) {
		mobileButton.addEventListener("click", () => {
			const isOpen = mobileButton.getAttribute("aria-expanded") === "true";
			mobileButton.setAttribute("aria-expanded", String(!isOpen));
			mobileMenu.classList.toggle("hidden", isOpen);
		});
	}

	const slides = document.querySelectorAll<HTMLElement>(".slide");
	if (
		slides.length < 2 ||
		window.matchMedia("(prefers-reduced-motion: reduce)").matches
	)
		return;

	let currentSlide = 0;
	let timer: number | undefined;
	const rotateSlide = () => {
		slides[currentSlide]?.classList.remove("active");
		currentSlide = (currentSlide + 1) % slides.length;
		slides[currentSlide]?.classList.add("active");
	};
	const stopRotation = () => {
		if (timer !== undefined) window.clearInterval(timer);
		timer = undefined;
	};
	const startRotation = () => {
		if (document.hidden || timer !== undefined) return;
		timer = window.setInterval(rotateSlide, 5000);
	};

	document.addEventListener("visibilitychange", () => {
		if (document.hidden) stopRotation();
		else startRotation();
	});
	startRotation();
};

if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", initSiteInteractions, {
		once: true,
	});
} else {
	initSiteInteractions();
}
