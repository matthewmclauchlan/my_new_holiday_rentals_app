import { Alert } from "react-native";
import { useEffect, useState, useCallback } from "react";

interface UseAppwriteOptions<T, P extends Record<string, string | number>> {
  fn: (params: P) => Promise<T>;
  params?: P;
  skip?: boolean;
}

interface UseAppwriteReturn<T, P> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: (newParams: P) => Promise<void>;
}

export const useAppwrite = <T, P extends Record<string, string | number>>({
  fn,
  params = {} as P,
  skip = false,
}: UseAppwriteOptions<T, P>): UseAppwriteReturn<T, P> => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(!skip);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(
    async (fetchParams: P) => {
      console.log("useAppwrite: fetching data with params:", fetchParams);
      setLoading(true);
      setError(null);
      try {
        const result = await fn(fetchParams);
        console.log("useAppwrite: received result:", result);
        setData(result);
      } catch (err: unknown) {
        const errorMessage =
          err instanceof Error ? err.message : "An unknown error occurred";
        console.error("useAppwrite: Error:", errorMessage);
        setError(errorMessage);
        Alert.alert("Error", errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [fn]
  );

  useEffect(() => {
    console.log("useAppwrite effect running with params:", params);
    if (!skip) {
      fetchData(params);
    }
    // Deep compare params via JSON.stringify
  }, [skip, JSON.stringify(params)]);

  const refetch = async (newParams: P) => {
    console.log("useAppwrite: refetch called with params:", newParams);
    await fetchData(newParams);
  };

  return { data, loading, error, refetch };
};
