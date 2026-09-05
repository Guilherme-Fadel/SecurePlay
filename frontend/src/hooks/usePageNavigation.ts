import { useState, useCallback, useEffect } from 'react';

interface UsePageNavigationOptions {
  totalPages: number;
  onLastPage?: () => void;
  enabled?: boolean;
}

export function usePageNavigation({ totalPages, onLastPage, enabled = true }: UsePageNavigationOptions) {
  const [currentPage, setCurrentPage] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [touchStart, setTouchStart] = useState<number | null>(null);

  const isLastPage = currentPage >= totalPages - 1;

  const goNext = useCallback(() => {
    if (isLastPage) {
      onLastPage?.();
    } else {
      setDirection(1);
      setCurrentPage((p) => Math.min(p + 1, totalPages - 1));
    }
  }, [isLastPage, totalPages, onLastPage]);

  const goPrev = useCallback(() => {
    setDirection(-1);
    setCurrentPage((p) => Math.max(p - 1, 0));
  }, []);

  const goTo = useCallback((page: number) => {
    const nextPage = Math.max(0, Math.min(page, totalPages - 1));
    setCurrentPage((current) => {
      if (nextPage !== current) setDirection(nextPage > current ? 1 : -1);
      return nextPage;
    });
  }, [totalPages]);

  useEffect(() => {
    if (!enabled) return;
    const handleKey = (e: KeyboardEvent) => {
      const target = e.target;
      if (e.altKey || e.ctrlKey || e.metaKey || (target instanceof HTMLElement && target.closest('input, textarea, select, video, [contenteditable="true"]'))) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') e.preventDefault();
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [goNext, goPrev, enabled]);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const diff = touchStart - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) goNext();
      else goPrev();
    }
    setTouchStart(null);
  };

  return {
    currentPage,
    direction,
    isLastPage,
    goNext,
    goPrev,
    goTo,
    handleTouchStart,
    handleTouchEnd,
  };
}
