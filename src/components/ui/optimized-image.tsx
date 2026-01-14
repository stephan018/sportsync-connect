import { useState, useRef, useEffect, forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface OptimizedImageProps {
  src: string;
  alt: string;
  fallbackSrc?: string;
  aspectRatio?: 'square' | '4/3' | '16/9' | '3/4' | 'auto';
  showSkeleton?: boolean;
  blurPlaceholder?: boolean;
  className?: string;
  imgClassName?: string;
  onLoad?: () => void;
  onError?: () => void;
}

export function OptimizedImage({
  src,
  alt,
  fallbackSrc,
  aspectRatio = 'auto',
  showSkeleton = true,
  blurPlaceholder = true,
  className,
  imgClassName,
  onLoad: externalOnLoad,
  onError: externalOnError,
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '100px', // Start loading 100px before entering viewport
        threshold: 0.01,
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Reset state when src changes
  useEffect(() => {
    setIsLoaded(false);
    setHasError(false);
  }, [src]);

  const handleLoad = () => {
    setIsLoaded(true);
    externalOnLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    if (fallbackSrc && imgRef.current) {
      imgRef.current.src = fallbackSrc;
    }
    externalOnError?.();
  };

  const aspectRatioClass = {
    'square': 'aspect-square',
    '4/3': 'aspect-[4/3]',
    '16/9': 'aspect-video',
    '3/4': 'aspect-[3/4]',
    'auto': '',
  }[aspectRatio];

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative overflow-hidden bg-muted',
        aspectRatioClass,
        className
      )}
    >
      {/* Skeleton placeholder */}
      {showSkeleton && !isLoaded && (
        <Skeleton className="absolute inset-0 w-full h-full" />
      )}

      {/* Blur placeholder */}
      {blurPlaceholder && !isLoaded && isInView && (
        <div className="absolute inset-0 bg-gradient-to-br from-muted via-muted/80 to-muted animate-pulse" />
      )}

      {/* Actual image - only load when in viewport */}
      {isInView && (
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          onLoad={handleLoad}
          onError={handleError}
          className={cn(
            'w-full h-full object-cover transition-opacity duration-500',
            isLoaded ? 'opacity-100' : 'opacity-0',
            imgClassName
          )}
        />
      )}
    </div>
  );
}

// Avatar optimized component
interface OptimizedAvatarProps {
  src?: string | null;
  alt: string;
  fallback: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function OptimizedAvatar({
  src,
  alt,
  fallback,
  size = 'md',
  className,
}: OptimizedAvatarProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-xl',
  }[size];

  // Reset when src changes
  useEffect(() => {
    setIsLoaded(false);
    setHasError(false);
  }, [src]);

  if (!src || hasError) {
    return (
      <div
        className={cn(
          'rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary',
          sizeClasses,
          className
        )}
      >
        {fallback}
      </div>
    );
  }

  return (
    <div className={cn('relative rounded-full overflow-hidden', sizeClasses, className)}>
      {!isLoaded && (
        <Skeleton className="absolute inset-0 w-full h-full rounded-full" />
      )}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
        className={cn(
          'w-full h-full object-cover transition-opacity duration-300',
          isLoaded ? 'opacity-100' : 'opacity-0'
        )}
      />
    </div>
  );
}

export default OptimizedImage;
