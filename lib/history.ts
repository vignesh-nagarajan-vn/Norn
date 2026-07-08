// Lightweight client-side interpretation history in localStorage. Not a full
// audit trail, but it gives a recent-work list and a persistence hook without a
// database. Dispatches an event so open views can refresh.

export interface HistoryItem {
  variant: string;
  classification: string;
  points: number;
  at: number;
}

const KEY = "norn-history";
const MAX = 15;
export const HISTORY_EVENT = "norn-history-changed";

export function getHistory(): HistoryItem[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as HistoryItem[]) : [];
  } catch {
    return [];
  }
}

export function addHistory(item: HistoryItem): void {
  if (typeof localStorage === "undefined") return;
  try {
    const list = getHistory().filter((x) => x.variant !== item.variant);
    list.unshift(item);
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
    window.dispatchEvent(new Event(HISTORY_EVENT));
  } catch {
    /* ignore */
  }
}

export function clearHistory(): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(KEY);
    window.dispatchEvent(new Event(HISTORY_EVENT));
  } catch {
    /* ignore */
  }
}
