import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Prevents automatic scroll-to-top behavior on route changes.
 * Only scrolls to top when navigating to a completely different section.
 */
export function ScrollRestoration() {
  const { pathname } = useLocation();
  const prevPathRef = useRef(pathname);
  
  useEffect(() => {
    const prevPath = prevPathRef.current;
    
    // Get the main section from path (e.g., /housekeeping from /housekeeping/inventory)
    const getSection = (path: string) => {
      const parts = path.split('/').filter(Boolean);
      return parts[0] || '';
    };
    
    const prevSection = getSection(prevPath);
    const currentSection = getSection(pathname);
    
    // Only scroll to top when changing to a different main section
    // Don't scroll when navigating within the same section (e.g., housekeeping/dashboard -> housekeeping/inventory)
    if (prevSection !== currentSection) {
      // Find the main content area and scroll it to top
      const mainContent = document.querySelector('main');
      if (mainContent) {
        mainContent.scrollTo({ top: 0, behavior: 'instant' });
      }
    }
    
    prevPathRef.current = pathname;
  }, [pathname]);
  
  return null;
}

