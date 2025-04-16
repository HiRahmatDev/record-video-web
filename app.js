let mediaRecorder;
let stream;

const preview = document.getElementById("preview");
const playback = document.getElementById("playback");
const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const mirrorBtn = document.getElementById("mirrorBtn");
const videoSourceSelect = document.getElementById("videoSource");

const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
const persistedDeviceId = localStorage.getItem("deviceId");

window.onload = () => {
  if (isIOS) {
    alert(
      "iOS does not support getUserMedia. Please use a different device or browser."
    );
    return;
  }

  initializeCamera();
};

videoSourceSelect.onchange = async (e) => {
  const deviceId = e.target.value;
  localStorage.setItem("deviceId", deviceId);
  await switchCamera(deviceId);
};

mirrorBtn.onclick = toggleMirror;

startBtn.onclick = startRecording;
stopBtn.onclick = stopRecording;

// === Initialization ===
async function initializeCamera() {
  try {
    const constraints = {
      video: persistedDeviceId
        ? { deviceId: { exact: persistedDeviceId } }
        : true,
      audio: true,
    };

    const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
    setStream(mediaStream);
    populateDeviceList(await navigator.mediaDevices.enumerateDevices());
  } catch (err) {
    console.error("Permission denied or error:", err);
  }
}

// === Camera / Stream ===
async function switchCamera(deviceId) {
  try {
    const constraints = {
      video: { deviceId: { exact: deviceId } },
      audio: true,
    };

    stopStream();
    const newStream = await navigator.mediaDevices.getUserMedia(constraints);
    setStream(newStream);
  } catch (err) {
    console.error("Error switching camera:", err);
  }
}

function stopStream() {
  if (stream) {
    stream.getTracks().forEach((track) => track.stop());
    stream = null;
  }
}

function setStream(mediaStream) {
  stream = mediaStream;
  preview.srcObject = mediaStream;
}

// === Mirror View ===
function toggleMirror() {
  const isMirrored = mirrorBtn.classList.toggle("mirrored");
  preview.style.transform = isMirrored ? "scaleX(-1)" : "scaleX(1)";
  mirrorBtn.innerHTML = isMirrored ? "Unmirror" : "Mirror";
  mirrorBtn.dataset.mirrored = isMirrored;
}

// === Recording ===
async function startRecording() {
  if (!stream) return;

  const mimeType = MediaRecorder.isTypeSupported("video/webm")
    ? "video/webm"
    : "";
  mediaRecorder = new MediaRecorder(stream, { mimeType });

  const recordedChunks = [];

  mediaRecorder.ondataavailable = async (e) => {
    if (e.data.size > 0) {
      recordedChunks.push(e.data);
      await saveChunk(e.data);
      // await uploadAudio(e.data);
    }
  };

  mediaRecorder.onstop = () => {
    const fullBlob = new Blob(recordedChunks, { type: "video/webm" });
    const videoURL = URL.createObjectURL(fullBlob);
    playback.src = videoURL;
    playback.style.display = "block";
    playback.play();
  };

  mediaRecorder.start(2000); // chunk every 2s
  startBtn.disabled = true;
  stopBtn.disabled = false;
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.stop();
  }
  startBtn.disabled = false;
  stopBtn.disabled = true;
}

// === Helpers ===
function populateDeviceList(deviceInfos) {
  const videoInputs = deviceInfos.filter((d) => d.kind === "videoinput");
  videoSourceSelect.innerHTML = "";

  videoInputs.forEach((device, index) => {
    const option = document.createElement("option");
    option.value = device.deviceId;
    option.text = device.label || `Camera ${index + 1}`;
    option.selected = persistedDeviceId === device.deviceId || index === 0;
    videoSourceSelect.appendChild(option);
  });
}
