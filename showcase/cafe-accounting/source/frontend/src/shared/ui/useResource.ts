import { useCallback, useEffect, useState } from "react";

export function useResource<T>(key: string, loader: (signal: AbortSignal) => Promise<T>) {
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{ key: string; revision: number; data?: T; error?: unknown }>();
  useEffect(() => {
    const controller = new AbortController();
    void loader(controller.signal).then(
      (data) => { if (!controller.signal.aborted) setResult({ key, revision, data }); },
      (error: unknown) => { if (!controller.signal.aborted) setResult({ key, revision, error }); },
    );
    return () => controller.abort();
  }, [key, loader, revision]);
  const reload = useCallback(() => setRevision((value) => value + 1), []);
  const current = result?.key === key && result.revision === revision;
  return {
    status: !current ? "loading" as const : result.error ? "error" as const : "ready" as const,
    data: current ? result.data : undefined, error: current ? result.error : undefined, reload,
  };
}
