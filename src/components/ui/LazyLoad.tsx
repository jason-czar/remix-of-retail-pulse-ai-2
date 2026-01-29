import { useInView } from 'react-intersection-observer';
import { useState, useEffect, ReactNode } from 'react';

interface LazyLoadProps {
  children: (enabled: boolean) => ReactNode;
  fallback?: ReactNode;
  threshold?: number;
  rootMargin?: string;
}

/**
 * Viewport-based lazy loading wrapper using Intersection Observer.
 * Defers rendering and data fetching until the component enters the viewport.
 */
export function LazyLoad({ 
  children, 
  fallback = null,
  threshold = 0.1,
  rootMargin = '100px'  // Start loading 100px before entering viewport
}: LazyLoadProps) {
  const [hasBeenVisible, setHasBeenVisible] = useState(false);
  const { ref, inView } = useInView({
    threshold,
    rootMargin,
    triggerOnce: true,  // Only trigger once
  });

  useEffect(() => {
    if (inView) {
      setHasBeenVisible(true);
    }
  }, [inView]);

  return (
    <div ref={ref}>
      {hasBeenVisible ? children(true) : fallback}
    </div>
  );
}
