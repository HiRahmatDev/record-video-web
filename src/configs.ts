export const configs = {
  DEFAULT_RECORDING_FORMAT: "video/mp4",
  DEFAULT_RECORD_TIME_SLICE: 10000,
  INDEXED_DB: {
    DB_NAME: "recordingDB",
    STORES: { VIDEO_CHUNKS: "videoChunks" },
  },
} as const;
