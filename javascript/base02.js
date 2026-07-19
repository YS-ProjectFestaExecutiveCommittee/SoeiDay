document.addEventListener('DOMContentLoaded', () => {
      
      const themeToggleBtn = document.getElementById('theme-toggle');
      const darkIcon = document.getElementById('theme-toggle-dark-icon');
      const lightIcon = document.getElementById('theme-toggle-light-icon');

      if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
        if (lightIcon) lightIcon.classList.remove('hidden');
      } else {
        document.documentElement.classList.remove('dark');
        if (darkIcon) darkIcon.classList.remove('hidden');
      }

      if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
          if (darkIcon) darkIcon.classList.toggle('hidden');
          if (lightIcon) lightIcon.classList.toggle('hidden');
          
          if (document.documentElement.classList.contains('dark')) {
            document.documentElement.classList.remove('dark');
            localStorage.theme = 'light';
          } else {
            document.documentElement.classList.add('dark');
            localStorage.theme = 'dark';
          }
        });
      }

      
      const mobileBtn = document.getElementById('mobile-menu-btn');
      const mobileMenu = document.getElementById('mobile-menu');
      
      if (mobileBtn && mobileMenu) {
        mobileBtn.addEventListener('click', () => {
          mobileMenu.classList.toggle('hidden');
        });
      }

      
      const slides = document.querySelectorAll('.slide');
      let currentSlide = 0;
      
      if (slides.length > 0) {
        setInterval(() => {
          slides[currentSlide].classList.remove('active');
          currentSlide = (currentSlide + 1) % slides.length;
          slides[currentSlide].classList.add('active');
        }, 5000);
      }
    });
