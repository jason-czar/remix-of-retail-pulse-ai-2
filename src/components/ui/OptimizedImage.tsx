import { useState } from 'react';
import { cn } from '@/lib/utils';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  /** Image source URL */
  src: string;
  /** Alt text for accessibility */
  alt: string;
  /** Fallback image source if main src fails to load */
  fallbackSrc?: string;
  /** CSS aspect ratio (e.g., "16/9", "1/1", "4/3") */
  aspectRatio?: string;
  /** Load immediately instead of lazy loading */
  priority?: boolean;
}

/**
 * Optimized image component with:
 * - Native lazy loading (unless priority)
 * - Async decoding for non-priority images
 * - Placeholder shimmer while loading
 * - Fallback image on error
 * - Smooth fade-in on load
 */
export function OptimizedImage({
  src,
  alt,
  fallbackSrc = '/placeholder.svg',
  aspectRatio,
  priority = false,
  className,
  ...props
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  return (
    <div 
      className={cn("relative overflow-hidden", className)}
      style={aspectRatio ? { aspectRatio } : undefined}
    >
      {/* Shimmer placeholder */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 bg-muted animate-pulse rounded-inherit" />
      )}
      
      <img
        src={hasError ? fallbackSrc : src}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        decoding={priority ? 'sync' : 'async'}
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
        className={cn(
          "w-full h-full object-cover transition-opacity duration-300",
          isLoaded ? "opacity-100" : "opacity-0"
        )}
        {...props}
      />
    </div>
  );
}
