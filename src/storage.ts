import { logSizeOfBytes } from "./utils";

const DB_NAME = "recordingDB";

export async function saveChunk(blob: Blob) {
  logSizeOfBytes(blob.size);
  // TODO: store to indexedDB
}
