import { TransferSessionSummary } from "@/lib/types";

const DB_NAME = "droply-offline-db";
const DB_VERSION = 1;
const STORE_HISTORY = "session_history";
const STORE_RESUMABLE = "resumable_chunks";

export interface ResumableFileRecord {
  sessionId: string;
  fileId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  sha256: string;
  totalChunks: number;
  receivedChunkCount: number;
  updatedAt: number;
}

function openDroplyDB(): Promise<IDBDatabase | null> {
  if (typeof window === "undefined" || !("indexedDB" in window)) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_HISTORY)) {
          db.createObjectStore(STORE_HISTORY, { keyPath: "sessionId" });
        }
        if (!db.objectStoreNames.contains(STORE_RESUMABLE)) {
          db.createObjectStore(STORE_RESUMABLE, { keyPath: "key" });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function saveSessionSummary(summary: TransferSessionSummary): Promise<void> {
  const db = await openDroplyDB();
  if (!db) return;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_HISTORY, "readwrite");
      const store = tx.objectStore(STORE_HISTORY);
      // Do not persist ephemeral blob:// URLs in IndexedDB across browser restarts
      const sanitized: TransferSessionSummary = {
        ...summary,
        files: summary.files.map((f) => ({
          ...f,
          downloadUrl: undefined,
        })),
      };
      store.put(sanitized);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        resolve();
      };
    } catch {
      db.close();
      resolve();
    }
  });
}

export async function loadSessionSummaries(limit = 10): Promise<TransferSessionSummary[]> {
  const db = await openDroplyDB();
  if (!db) return [];

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_HISTORY, "readonly");
      const store = tx.objectStore(STORE_HISTORY);
      const req = store.getAll();
      req.onsuccess = () => {
        db.close();
        const items = (req.result as TransferSessionSummary[]) || [];
        items.sort((a, b) => b.completedAt - a.completedAt);
        resolve(items.slice(0, limit));
      };
      req.onerror = () => {
        db.close();
        resolve([]);
      };
    } catch {
      db.close();
      resolve([]);
    }
  });
}

export async function clearSessionHistory(): Promise<void> {
  const db = await openDroplyDB();
  if (!db) return;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction([STORE_HISTORY, STORE_RESUMABLE], "readwrite");
      tx.objectStore(STORE_HISTORY).clear();
      tx.objectStore(STORE_RESUMABLE).clear();
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        resolve();
      };
    } catch {
      db.close();
      resolve();
    }
  });
}

