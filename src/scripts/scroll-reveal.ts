const initScrollReveal = () => {
	const elements = document.querySelectorAll<HTMLElement>(".credit-reveal");

	if (elements.length === 0) return;
	if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
		elements.forEach((element) => {
			element.classList.add("visible");
		});
		return;
	}

	if (!("IntersectionObserver" in window)) {
		elements.forEach((element) => {
			element.classList.add("visible");
		});
		return;
	}

	let remaining = elements.length;
	const observer = new IntersectionObserver(
		(entries, observer) => {
			entries.forEach((entry) => {
				if (!entry.isIntersecting) return;

				entry.target.classList.add("visible");
				observer.unobserve(entry.target);
				remaining -= 1;
			});
			if (remaining === 0) observer.disconnect();
		},
		{
			root: null,
			rootMargin: "0px 0px -10% 0px",
			threshold: 0.01,
		},
	);

	elements.forEach((element) => {
		observer.observe(element);
	});
};

if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", initScrollReveal, {
		once: true,
	});
} else {
	initScrollReveal();
}
