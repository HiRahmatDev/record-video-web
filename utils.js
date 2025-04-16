function logSizeOfBytes(bytes) {
  console.log({
    B: `${bytes}B`,
    KB: `${(bytes / 1024).toFixed(2)}KB`,
    MB: `${(bytes / (1024 * 1024)).toFixed(2)}MB`,
  });
}
