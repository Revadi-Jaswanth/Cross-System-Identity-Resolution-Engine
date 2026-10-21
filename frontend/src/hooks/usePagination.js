import { useState, useCallback } from 'react';

export const usePagination = (initialPage = 1, initialLimit = 10) => {
  const [page, setPage] = useState(initialPage);
  const [limit, setLimit] = useState(initialLimit);

  const nextPage = useCallback((totalPages) => {
    setPage((prev) => (totalPages && prev >= totalPages ? prev : prev + 1));
  }, []);

  const prevPage = useCallback(() => {
    setPage((prev) => (prev <= 1 ? 1 : prev - 1));
  }, []);

  const resetPagination = useCallback(() => {
    setPage(1);
  }, []);

  return {
    page,
    limit,
    setPage,
    setLimit,
    nextPage,
    prevPage,
    resetPagination
  };
};
