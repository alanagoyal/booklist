import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, Dispatch, SetStateAction } from "react";

export const useEntityClick = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  return useCallback((id: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("key", `${id}--${Date.now()}`);
    router.push(`?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);
};

type ViewHistoryItem = {
  id: string;
  actualId: string;
  type: "book" | "recommender";
};

export const useDetailViewClick = (
  setViewHistory: Dispatch<SetStateAction<ViewHistoryItem[]>>,
  viewHistory: ViewHistoryItem[],
  setIsNavigating: Dispatch<SetStateAction<boolean>>,
  setHoveredTabId: Dispatch<SetStateAction<string | null>>
) => {
  const router = useRouter();
  const searchParams = useSearchParams();

  return useCallback(
    (view: ViewHistoryItem) => {
      setIsNavigating(true);
      setHoveredTabId(null);

      const params = new URLSearchParams(searchParams.toString());
      params.set("key", view.id);
      router.push(`?${params.toString()}`, { scroll: false });
      setViewHistory(viewHistory.slice(0, viewHistory.indexOf(view) + 1));

      setTimeout(() => {
        setIsNavigating(false);
      }, 50);
    },
    [router, searchParams, setViewHistory, viewHistory, setIsNavigating, setHoveredTabId]
  );
};
