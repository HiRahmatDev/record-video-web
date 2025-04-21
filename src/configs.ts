export const configs = {
  DEFAULT_RECORDING_FORMAT: "video/webm",
  RECORD_TIME_SLICE_MS: 10000,
  INDEXED_DB: {
    DB_NAME: "recordingDB",
    STORES: { VIDEO_CHUNKS: "videoChunks" },
  },
} as const;
