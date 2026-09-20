import { useCallback, Dispatch, SetStateAction } from "react";

// Query-only browsing state stays local. Next's native history integration
// keeps useSearchParams and back/forward in sync without refetching the page.
export function openEntity(id: string) {
  const params = new URLSearchParams(window.location.search);
  params.set("key", `${id}--${Date.now()}`);
  window.history.pushState(null, "", `?${params}`);
}

export const useEntityClick = () => useCallback(openEntity, []);

type ViewHistoryItem = { id: string; actualId: string };

export const useDetailViewClick = (
  setViewHistory: Dispatch<SetStateAction<ViewHistoryItem[]>>,
  viewHistory: ViewHistoryItem[],
  setIsNavigating: Dispatch<SetStateAction<boolean>>,
  setHoveredTabId: Dispatch<SetStateAction<string | null>>
) => useCallback((view: ViewHistoryItem) => {
  setIsNavigating(true);
  setHoveredTabId(null);
  const params = new URLSearchParams(window.location.search);
  params.set("key", view.id);
  window.history.pushState(null, "", `?${params}`);
  setViewHistory(viewHistory.slice(0, viewHistory.indexOf(view) + 1));
  setTimeout(() => setIsNavigating(false), 50);
}, [setViewHistory, viewHistory, setIsNavigating, setHoveredTabId]);
