(function () {
  'use strict';

  const STORAGE_KEY = 'soei-fes-theme';

  function setDarkMode(isDark) {
    const root = document.documentElement;
    const body = document.body;
    root.classList.toggle('dark', isDark);
    body.classList.toggle('dark', isDark);
    root.style.colorScheme = isDark ? 'dark' : 'light';

    const darkIcons = document.querySelectorAll('#themeToggleDarkIcon, [data-theme-icon="dark"]');
    const lightIcons = document.querySelectorAll('#themeToggleLightIcon, [data-theme-icon="light"]');
    darkIcons.forEach((el) => el.classList.toggle('hidden', !isDark));
    lightIcons.forEach((el) => el.classList.toggle('hidden', isDark));
  }

  function initialDarkMode() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'dark') return true;
    if (stored === 'light') return false;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  function bindThemeButtons() {
    const selectors = [
      '#theme-toggle',
      '#themeToggle',
      '[data-theme-toggle]'
    ];

    const button = document.querySelector(selectors.join(','));
    if (!button || button.dataset.themeBound === '1') return;

    button.dataset.themeBound = '1';
    button.addEventListener('click', function () {
      const isDark = !document.documentElement.classList.contains('dark');
      setDarkMode(isDark);
      localStorage.setItem(STORAGE_KEY, isDark ? 'dark' : 'light');
    });
  }

  function boot() {
    setDarkMode(initialDarkMode());
    bindThemeButtons();

    const observer = new MutationObserver(bindThemeButtons);
    observer.observe(document.documentElement, { childList: true, subtree: true });

    window.addEventListener('storage', function (event) {
      if (event.key === STORAGE_KEY) setDarkMode(initialDarkMode());
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
