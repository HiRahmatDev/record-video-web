export const configs = {
  VIDEO_TYPE: "video/webm",
  RECORD_TIME_SLICE_MS: 1000,
  INDEXED_DB: {
    DB_NAME: "recordingDB",
    STORES: { VIDEO_CHUNKS: "videoChunks" },
  },
} as const;
