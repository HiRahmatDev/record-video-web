async function saveChunk(blob) {
  const idb = await openDB();

  console.log({ idb, blob, blobSize: logSizeOfBytes(blob.size) });
  // TODO: store to indexedDB

  // const tx = idb.transaction("chunks", "readwrite");
  // tx.objectStore("chunks").add({ timestamp: Date.now(), blob });
  // await tx.done;
}

async function openDB() {
  if (!window.indexedDB) throw new Error("IndexedDB not supported");

  const request = window.indexedDB.open("recordingsDB", 1);

  request.onerror = (event) => {
    // Do something with request.error!
    console.error("IDB error", event.target.error);
  };

  // This event is only triggered if the database did not previously exist,
  // is different version (schema), and is created for the first time.
  request.onupgradeneeded = (event) => {
    const db = event.target.result;
    if (!db.objectStoreNames.contains("chunks")) {
      db.createObjectStore("chunks", { keyPath: "timestamp" });
    }
  };

  return request;
}
