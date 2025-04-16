async function uploadAudio(blob) {
  const formData = new FormData();
  formData.append("audio", blob);
  try {
    const res = await fetch("/api/upload-audio", {
      method: "POST",
      body: formData,
    });
    console.log("Uploaded:", await res.text());
  } catch (err) {
    console.error("Upload failed:", err);
  }
}