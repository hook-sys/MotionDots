export const MAX_SCRIPT_CHARS = 5000;

// 1 credit per 100 characters of script, at least 1.
export const voiceCredits = (script: string) => Math.max(1, Math.ceil(script.length / 100));

export const AUDIO_TYPES: Record<string, string> = {
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/mp4": "m4a",
  "audio/x-m4a": "m4a",
  "audio/ogg": "ogg",
  "audio/webm": "webm",
};
export const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

export const IMAGE_TYPES: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

// The file's extension if it is an allowed type and size, else an error message.
export function checkFile(file: File, types: Record<string, string>, maxBytes: number): { ext: string } | { error: string } {
  const ext = types[file.type];
  if (!ext) return { error: `Unsupported file type: ${file.type || "unknown"}` };
  if (file.size === 0) return { error: "File is empty" };
  if (file.size > maxBytes) return { error: `File is larger than ${maxBytes / 1024 / 1024} MB` };
  return { ext };
}
