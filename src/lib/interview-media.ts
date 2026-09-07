export type InterviewMedia = {
  stream: MediaStream;
  hasVideo: boolean;
  hasAudio: boolean;
};

const CONSTRAINT_TRIES: MediaStreamConstraints[] = [
  {
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
  },
  { audio: true, video: { facingMode: "user" } },
  { audio: true, video: true },
  { audio: true, video: false },
  { audio: false, video: { facingMode: "user" } },
];

export function mediaErrorMessage(err: unknown): string {
  const name =
    err && typeof err === "object" && "name" in err ? String((err as { name: string }).name) : "";
  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    return "Allow camera and microphone in the browser prompt, then try again.";
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return "No camera or microphone found. Plug one in and try again.";
  }
  if (name === "NotReadableError" || name === "TrackStartError") {
    return "Camera or microphone is already in use by another app.";
  }
  if (name === "SecurityError") {
    return "This page must be served over HTTPS (or localhost) to use camera and mic.";
  }
  return "Could not start camera and microphone. Check browser permissions and try again.";
}

export async function acquireInterviewMedia(): Promise<InterviewMedia> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    throw new Error("This browser cannot access camera or microphone.");
  }

  let lastError: unknown;
  for (const constraints of CONSTRAINT_TRIES) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      const hasVideo = stream.getVideoTracks().some((t) => t.readyState === "live");
      const hasAudio = stream.getAudioTracks().some((t) => t.readyState === "live");
      if (!hasVideo && !hasAudio) {
        stream.getTracks().forEach((t) => t.stop());
        continue;
      }
      return { stream, hasVideo, hasAudio };
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError instanceof Error ? lastError : new Error(mediaErrorMessage(lastError));
}

export function stopInterviewMedia(stream: MediaStream | null | undefined) {
  stream?.getTracks().forEach((track) => {
    track.stop();
  });
}

export async function playLocalPreview(
  video: HTMLVideoElement | null,
  stream: MediaStream | null,
): Promise<void> {
  if (!video || !stream) return;
  if (video.srcObject !== stream) {
    video.srcObject = stream;
  }
  video.muted = true;
  video.playsInline = true;
  video.autoplay = true;
  try {
    await video.play();
  } catch {
    // Autoplay can still fail if the element is hidden; a later attach retries.
  }
}

export function setTrackEnabled(stream: MediaStream | null, kind: "audio" | "video", enabled: boolean) {
  const tracks = kind === "audio" ? stream?.getAudioTracks() : stream?.getVideoTracks();
  tracks?.forEach((track) => {
    track.enabled = enabled;
  });
}
