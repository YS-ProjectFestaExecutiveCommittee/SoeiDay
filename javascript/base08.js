document.addEventListener('DOMContentLoaded', () => {
      const trigger = document.getElementById('secret-trigger');
      if (!trigger) return;

      let tapCount = 0;
      let pressTimer = null;
      let isUnlocked = false;
      let resetTimer = null;

      
      trigger.addEventListener('click', (e) => {
        if (isUnlocked) return;
        
        tapCount++;
        
        
        if (resetTimer) clearTimeout(resetTimer);
        
        if (tapCount >= 5) {
          isUnlocked = true;
          
          trigger.style.transition = 'color 0.5s, text-shadow 0.5s';
          trigger.style.color = '#ef4444'; 
          trigger.style.textShadow = '0 0 15px rgba(239, 68, 68, 0.9)';
          
          
          resetTimer = setTimeout(() => {
            if (!pressTimer) {
              isUnlocked = false;
              tapCount = 0;
              trigger.style.color = '';
              trigger.style.textShadow = '';
            }
          }, 5000);
        } else {
          
          resetTimer = setTimeout(() => {
            tapCount = 0;
          }, 1000);
        }
      });

      
      const startPress = (e) => {
        if (!isUnlocked) return;
        
        if(e.cancelable) e.preventDefault(); 
        
        
        pressTimer = setTimeout(() => {
          
          
          window.location.href = 'https://ataro-qqq.github.io/guchi/';
        }, 2000);
      };

      const cancelPress = () => {
        if (pressTimer) {
          clearTimeout(pressTimer);
          pressTimer = null;
        }
      };

      
      trigger.addEventListener('mousedown', startPress);
      trigger.addEventListener('touchstart', startPress, {passive: false});
      
      trigger.addEventListener('mouseup', cancelPress);
      trigger.addEventListener('mouseleave', cancelPress);
      trigger.addEventListener('touchend', cancelPress);
      trigger.addEventListener('touchcancel', cancelPress);
    });
