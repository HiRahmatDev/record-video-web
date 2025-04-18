import { configs } from "./configs";
import {
  clearAllChunks,
  getVideoChunks,
  initializeDatabase,
  saveChunk,
} from "./storage";
import "./style.css";

const mirrorBtn = document.getElementById("mirrorBtn") as HTMLButtonElement;
const playback = document.getElementById("playback") as HTMLVideoElement;
const preview = document.getElementById("preview") as HTMLVideoElement;
const startBtn = document.getElementById("startBtn") as HTMLButtonElement;
const stopBtn = document.getElementById("stopBtn") as HTMLButtonElement;
const videoChunks = document.getElementById("videoChunks") as HTMLUListElement;
const videoSourceSelect = document.getElementById(
  "videoSource"
) as HTMLSelectElement;

// const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
const persistedDeviceId = localStorage.getItem("deviceId");

let mediaRecorder: MediaRecorder | null = null;
let stream: MediaStream | null = null;
let isRecording = false;

window.addEventListener("load", async () => {
  // if (isIOS) {
  //   alert(
  //     "iOS does not support getUserMedia. Please use a different device or browser."
  //   );
  //   return;
  // }

  const db = await initializeDatabase();

  if (!db) return;

  initializePlayback();
  initializeCamera();
});

window.addEventListener("beforeunload", (e) => {
  if (isRecording) {
    e.preventDefault();
    e.returnValue = "";
  }
});

videoSourceSelect.addEventListener("change", async (e) => {
  const deviceId = (e.target as HTMLSelectElement).value;
  localStorage.setItem("deviceId", deviceId);
  await switchCamera(deviceId);
});

mirrorBtn.addEventListener("click", toggleMirror);
startBtn.addEventListener("click", startRecording);
stopBtn.addEventListener("click", stopRecording);

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

async function initializePlayback() {
  const persistedRecordedChunks = await getVideoChunks();
  if (persistedRecordedChunks.length) {
    setPlayback(persistedRecordedChunks);
    setListVideoChunks(persistedRecordedChunks);
  }
}

// === Camera / Stream ===
async function switchCamera(deviceId: string) {
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

function setStream(mediaStream: MediaStream) {
  stream = mediaStream;
  preview.srcObject = mediaStream;
}

function setPlayback(blobParts: Blob[]) {
  const fullBlob = new Blob(blobParts, { type: configs.VIDEO_TYPE });
  const videoURL = URL.createObjectURL(fullBlob);

  playback.src = videoURL;
  playback.style.display = "block";
}

// === Mirror View ===
function toggleMirror() {
  const isMirrored = mirrorBtn.classList.toggle("mirrored");
  preview.style.transform = isMirrored ? "scaleX(-1)" : "scaleX(1)";
  mirrorBtn.innerHTML = isMirrored ? "Unmirror" : "Mirror";
  mirrorBtn.dataset.mirrored = String(isMirrored);
}

// === Recording ===
async function startRecording() {
  if (!stream) return;
  isRecording = true;

  const mimeType = MediaRecorder.isTypeSupported(configs.VIDEO_TYPE)
    ? configs.VIDEO_TYPE
    : "";
  mediaRecorder = new MediaRecorder(stream, { mimeType });

  const recordedChunks: Blob[] = [];

  // Remove all persisted video chunks before save new chunks
  const persistedRecordedChunks = await getVideoChunks();
  if (persistedRecordedChunks.length) {
    await clearAllChunks();
  }

  mediaRecorder.addEventListener("dataavailable", async (e) => {
    if (e.data.size > 0) {
      recordedChunks.push(e.data);
      await saveChunk(e.data);
      // await uploadAudio(e.data);
    }
  });

  mediaRecorder.addEventListener("stop", async () => {
    const persistedRecordedChunks = await getVideoChunks();

    setListVideoChunks(persistedRecordedChunks);

    const blobParts = persistedRecordedChunks?.length
      ? persistedRecordedChunks
      : recordedChunks;

    const fullBlob = new Blob(blobParts, { type: configs.VIDEO_TYPE });
    const videoURL = URL.createObjectURL(fullBlob);

    playback.src = videoURL;
    playback.style.display = "block";
  });

  mediaRecorder.start(configs.RECORD_TIME_SLICE_MS);
  startBtn.disabled = true;
  stopBtn.disabled = false;
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.stop();
  }
  startBtn.disabled = false;
  stopBtn.disabled = true;
  isRecording = false;
}

async function setListVideoChunks(recordedChunks: Blob[]) {
  const hasLi = videoChunks && videoChunks.querySelector("li") !== null;

  if (hasLi) {
    videoChunks.innerHTML = "";
  }

  recordedChunks.forEach((blob, index) => {
    const li = document.createElement("li");

    li.textContent = `Blob ${index + 1}: { size: ${(
      blob.size /
      (1024 * 1024)
    ).toFixed(2)}MB, type: '${blob.type}' }`;

    videoChunks.append(li);
  });
}

// === Helpers ===
function populateDeviceList(deviceInfos: MediaDeviceInfo[]) {
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
