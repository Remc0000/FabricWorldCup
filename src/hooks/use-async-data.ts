import { useState, useEffect, useRef } from 'react';

interface AsyncDataState<T> {
  data: T | undefined;
  isLoading: boolean;
  error: Error | undefined;
  refetch: () => void;
}

export function useAsyncData<T>(fn: () => Promise<T>): AsyncDataState<T> {
  const [data, setData] = useState<T | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | undefined>();
  const [tick, setTick] = useState(0);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(undefined);
    fnRef.current()
      .then(result => { if (!cancelled) { setData(result); setIsLoading(false); } })
      .catch(err => { if (!cancelled) { setError(err instanceof Error ? err : new Error(String(err))); setIsLoading(false); } });
    return () => { cancelled = true; };
  }, [tick]);

  return { data, isLoading, error, refetch: () => setTick(t => t + 1) };
}
