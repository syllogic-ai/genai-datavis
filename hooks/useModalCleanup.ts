import { useEffect } from 'react';

export function useModalCleanup() {
  useEffect(() => {
    const cleanupStuckOverlays = () => {
      // Find all Radix dialog overlays
      const overlays = document.querySelectorAll('[data-radix-dialog-overlay]');
      
      overlays.forEach((overlay) => {
        const state = overlay.getAttribute('data-state');
        
        // Remove any overlays that are marked as closed but still visible
        if (state === 'closed' || !state) {
          const htmlElement = overlay as HTMLElement;
          if (htmlElement.style.display !== 'none') {
            console.log('Cleaning up stuck overlay:', overlay);
            htmlElement.style.display = 'none';
            htmlElement.style.pointerEvents = 'none';
            htmlElement.style.opacity = '0';
            
            // Remove from DOM after animation
            setTimeout(() => {
              if (overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
              }
            }, 300);
          }
        }
      });

      // Also check for any orphaned portal containers
      const portals = document.querySelectorAll('[data-radix-portal]');
      portals.forEach((portal) => {
        if (!portal.hasChildNodes()) {
          console.log('Cleaning up empty portal:', portal);
          if (portal.parentNode) {
            portal.parentNode.removeChild(portal);
          }
        }
      });
    };

    // Clean up on mount
    cleanupStuckOverlays();

    // Set up cleanup interval
    const interval = setInterval(cleanupStuckOverlays, 1000);

    // Cleanup on window focus (in case user switched tabs)
    const handleFocus = () => {
      setTimeout(cleanupStuckOverlays, 100);
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // Function to manually trigger cleanup
  const manualCleanup = () => {
    const overlays = document.querySelectorAll('[data-radix-dialog-overlay]');
    overlays.forEach((overlay) => {
      const htmlElement = overlay as HTMLElement;
      htmlElement.style.display = 'none';
      htmlElement.style.pointerEvents = 'none';
      if (overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
    });
  };

  return { manualCleanup };
} 