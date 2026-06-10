import { useState, useCallback, useEffect } from 'react';

interface UsePageNavigationOptions {
  totalPages: number;
  onLastPage?: () => void;
}

export function usePageNavigation({ totalPages, onLastPage }: UsePageNavigationOptions) {
  const [currentPage, setCurrentPage] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);

  const isLastPage = currentPage >= totalPages - 1;

  const goNext = useCallback(() => {
    if (isLastPage) {
      onLastPage?.();
    } else {
      setCurrentPage((p) => Math.min(p + 1, totalPages - 1));
    }
  }, [isLastPage, totalPages, onLastPage]);

  const goPrev = useCallback(() => {
    setCurrentPage((p) => Math.max(p - 1, 0));
  }, []);

  const goTo = useCallback((page: number) => {
    setCurrentPage(Math.max(0, Math.min(page, totalPages - 1)));
  }, [totalPages]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [goNext, goPrev]);

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
    isLastPage,
    goNext,
    goPrev,
    goTo,
    handleTouchStart,
    handleTouchEnd,
  };
}
