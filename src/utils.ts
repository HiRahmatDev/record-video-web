export function logSizeOfBytes(bytes: number) {
  console.log("Sizes:", {
    B: `${bytes}B`,
    KB: `${(bytes / 1024).toFixed(2)}KB`,
    MB: `${(bytes / (1024 * 1024)).toFixed(2)}MB`,
  });
}

export function formatSize(bytes: number) {
  const oneMB = 1024 * 1024;
  const sizeInMB = (bytes / oneMB).toFixed(2) + "MB";
  const sizeInKB = (bytes / 1024).toFixed(2) + "KB";
  return bytes > oneMB ? sizeInMB : sizeInKB;
}
