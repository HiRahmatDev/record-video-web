import { configs } from "./configs";
import {
  clearAllChunks,
  deleteDatabase,
  getVideoChunks,
  initializeDatabase,
  saveChunk,
} from "./storage";
import "./style.css";
import supportedBrowserVideoFormatsJson from "./supportedBrowserVideoFormats.json";
import { formatSize } from "./utils";

const DOMElements = {
  mirrorBtn: document.getElementById("mirrorBtn") as HTMLButtonElement,
  playback: document.getElementById("playback") as HTMLVideoElement,
  preview: document.getElementById("preview") as HTMLVideoElement,
  startBtn: document.getElementById("startBtn") as HTMLButtonElement,
  stopBtn: document.getElementById("stopBtn") as HTMLButtonElement,
  videoChunks: document.getElementById("videoChunks") as HTMLUListElement,
  videoSourceSelect: document.getElementById("videoSource") as HTMLSelectElement,
  recordingFormatSelect: document.getElementById("videoFormat") as HTMLSelectElement,
  chunkEverySelect: document.getElementById("chunkEvery") as HTMLSelectElement,
  resultLabel: document.getElementById("resultLabel") as HTMLParagraphElement,
  clearDbBtn: document.getElementById("clearDbBtn") as HTMLButtonElement,
};

const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
const persistedDeviceId = localStorage.getItem("deviceId");
const videoFormatList = supportedBrowserVideoFormatsJson;

let mediaRecorder: MediaRecorder | null = null;
let stream: MediaStream | null = null;
let isRecording = false;

window.addEventListener("load", async () => {
  if (isIOS) alertIOSWarning();

  setDefaultChunkEvery();
  const db = await initializeDatabase();
  if (!db) return;

  await populateVideoFormatList();
  await initializeCamera();
  await initializePlayback();
});

window.addEventListener("beforeunload", preventUnloadDuringRecording);

DOMElements.videoSourceSelect.addEventListener("change", handleCameraSwitch);
DOMElements.mirrorBtn.addEventListener("click", toggleMirror);
DOMElements.startBtn.addEventListener("click", startRecording);
DOMElements.stopBtn.addEventListener("click", stopRecording);
DOMElements.clearDbBtn.addEventListener("click", deleteDatabase);

// === Initialization ===
async function initializeCamera() {
  try {
    const constraints = getCameraConstraints(persistedDeviceId);
    const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
    setStream(mediaStream);
    populateDeviceList(await navigator.mediaDevices.enumerateDevices());
  } catch (err) {
    console.error("Permission denied or error:", err);
  }
}

async function initializePlayback() {
  const persistedChunks = await getVideoChunks();
  if (persistedChunks.length) {
    setPlayback(persistedChunks);
    updateVideoChunksList(persistedChunks);
  }
}

// === Camera / Stream ===
async function handleCameraSwitch(e: Event) {
  const deviceId = (e.target as HTMLSelectElement).value;
  localStorage.setItem("deviceId", deviceId);
  await switchCamera(deviceId);
}

async function switchCamera(deviceId: string) {
  try {
    stopStream();
    const newStream = await navigator.mediaDevices.getUserMedia(getCameraConstraints(deviceId));
    setStream(newStream);
  } catch (err) {
    console.error("Error switching camera:", err);
  }
}

function stopStream() {
  if (stream) {
    stream.getTracks().forEach((track) => track.stop());
    stream = null;
    stopRecording();
  }
}

function setStream(mediaStream: MediaStream) {
  stream = mediaStream;
  DOMElements.preview.srcObject = mediaStream;
}

// === Playback ===
function setPlayback(blobParts: Blob[]) {
  const fullBlob = new Blob(blobParts, { type: DOMElements.recordingFormatSelect.value });
  const videoURL = URL.createObjectURL(fullBlob);

  updateResultLabel(fullBlob);
  DOMElements.playback.src = videoURL;
  DOMElements.playback.style.display = "block";
}

// === Mirror View ===
function toggleMirror() {
  const isMirrored = DOMElements.mirrorBtn.classList.toggle("mirrored");
  DOMElements.preview.style.transform = isMirrored ? "scaleX(-1)" : "scaleX(1)";
  DOMElements.mirrorBtn.innerHTML = isMirrored ? "Unmirror" : "Mirror";
  DOMElements.mirrorBtn.dataset.mirrored = String(isMirrored);
}

// === Recording ===
async function startRecording() {
  if (!stream) return;
  isRecording = true;

  const mimeType = getSupportedMimeType();
  mediaRecorder = new MediaRecorder(stream, { mimeType });

  const recordedChunks: Blob[] = [];
  await clearAllChunks();

  mediaRecorder.addEventListener("dataavailable", async (e) => {
    if (e.data.size > 0) {
      recordedChunks.push(e.data);
      await saveChunk(e.data);
    }
  });

  mediaRecorder.addEventListener("stop", async () => {
    const persistedChunks = await getVideoChunks();
    const chunks = persistedChunks.length ? persistedChunks : recordedChunks;
    setPlayback(chunks);
    updateVideoChunksList(chunks);
  });

  mediaRecorder.start(Number(DOMElements.chunkEverySelect.value));
  toggleRecordingButtons(true);
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.stop();
  }
  toggleRecordingButtons(false);
  isRecording = false;
}

function toggleRecordingButtons(isRecording: boolean) {
  DOMElements.startBtn.disabled = isRecording;
  DOMElements.stopBtn.disabled = !isRecording;
}

// === Helpers ===
function populateDeviceList(deviceInfos: MediaDeviceInfo[]) {
  const videoInputs = deviceInfos.filter((d) => d.kind === "videoinput");
  DOMElements.videoSourceSelect.innerHTML = "";

  videoInputs.forEach((device, index) => {
    const option = document.createElement("option");
    option.value = device.deviceId;
    option.text = device.label || `Camera ${index + 1}`;
    option.selected = persistedDeviceId === device.deviceId || index === 0;
    DOMElements.videoSourceSelect.appendChild(option);
  });
}

function populateVideoFormatList() {
  return new Promise((resolve) => {
    videoFormatList.forEach((format, index) => {
      const option = document.createElement("option");
      option.value = format.mime;
      option.text = `${format.extension}, ${format.codecs} (${format.note})`;
      option.selected =
        configs.DEFAULT_RECORDING_FORMAT === format.mime || index === 0;
      DOMElements.recordingFormatSelect.appendChild(option);
      resolve(DOMElements.recordingFormatSelect.value);
    });
  });
}

function updateVideoChunksList(recordedChunks: Blob[]) {
  DOMElements.videoChunks.innerHTML = "";
  recordedChunks.forEach((blob, index) => {
    const li = document.createElement("li");
    li.textContent = `Blob ${index + 1}: { size: ${formatSize(blob.size)}, type: '${blob.type}' }`;
    DOMElements.videoChunks.append(li);
  });
}

function setDefaultChunkEvery() {
  DOMElements.chunkEverySelect.value = String(configs.DEFAULT_RECORD_TIME_SLICE);
}

function updateResultLabel(blob: Blob) {
  DOMElements.resultLabel.innerHTML = `Result (${formatSize(blob.size)}):`;
}

function getCameraConstraints(deviceId?: string | null) {
  return {
    video: deviceId ? { deviceId: { exact: deviceId } } : true,
    audio: true,
  };
}

function getSupportedMimeType() {
  return MediaRecorder.isTypeSupported(DOMElements.recordingFormatSelect.value)
    ? DOMElements.recordingFormatSelect.value
    : "";
}

function preventUnloadDuringRecording(e: BeforeUnloadEvent) {
  if (isRecording) {
    e.preventDefault();
  }
}

function alertIOSWarning() {
  alert(
    "iOS detected. If you're experiencing issues, your browser may not fully support camera access (getUserMedia). Try using a different browser or device for the best experience."
  );
}
