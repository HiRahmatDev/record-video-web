import { configs } from "./configs";

const DB_NAME = configs.INDEXED_DB.DB_NAME;
const STORES = configs.INDEXED_DB.STORES;

let db!: IDBDatabase;

export async function initializeDatabase() {
  return new Promise((resolve, reject) => {
    const DBOpenRequest = indexedDB.open(DB_NAME, 1);

    DBOpenRequest.onerror = () => {
      console.error(`open idb error: ${DBOpenRequest.error?.message}`);
      reject();
    };

    DBOpenRequest.onsuccess = () => {
      console.log("open idb success", DBOpenRequest.result);
      db = DBOpenRequest.result;

      resolve(db);
    };

    DBOpenRequest.onupgradeneeded = (e) => {
      db = (e.target as IDBOpenDBRequest)?.result;

      console.log("db upgraded", db);

      if (!db.objectStoreNames.contains(STORES.VIDEO_CHUNKS)) {
        db.createObjectStore(STORES.VIDEO_CHUNKS, {
          keyPath: "timestamp",
        });
      }
    };
  });
}

export function clearAllChunks() {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.VIDEO_CHUNKS, "readwrite");
    const store = transaction.objectStore(STORES.VIDEO_CHUNKS);

    const request = store.clear();

    request.onerror = () => {
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };
  });
}

export async function saveChunk(blob: Blob) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.VIDEO_CHUNKS, "readwrite");
    const store = transaction.objectStore(STORES.VIDEO_CHUNKS);

    const request = store.add({ chunk: blob, timestamp: Date.now() });

    request.onerror = () => {
      reject(request.error);
    };

    request.onsuccess = () => {
      console.log("success save chunk:", request.result);
      resolve(request.result);
    };
  });
}

export async function getVideoChunks() {
  return new Promise<Blob[]>((resolve, reject) => {
    const transaction = db.transaction(STORES.VIDEO_CHUNKS, "readonly");
    const store = transaction.objectStore(STORES.VIDEO_CHUNKS);

    const request = store.openCursor();

    const chunks: Blob[] = [];

    request.onerror = () => {
      reject(request.error);
    };

    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        chunks.push(cursor?.value.chunk);
        cursor?.continue();
      } else {
        resolve(chunks);
      }
    };
  });
}
