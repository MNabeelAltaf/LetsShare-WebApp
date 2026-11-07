/**
 * Formats byte count into a human-readable string (B, KB, MB, GB).
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Formats duration in seconds into human-readable time (e.g., "1m 24s" or "12s").
 */
export function formatDuration(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds) || seconds < 0) return "--";
  if (seconds < 1) return "< 1s";
  const rounded = Math.ceil(seconds);
  if (rounded < 60) return `${rounded}s`;
  const mins = Math.floor(rounded / 60);
  const secs = rounded % 60;
  if (mins < 60) return `${mins}m ${secs}s`;
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  return `${hours}h ${remMins}m`;
}

/**
 * Classifies a MIME type / filename into a general file category.
 */
export type FileCategory =
  | "image"
  | "video"
  | "audio"
  | "pdf"
  | "archive"
  | "document"
  | "code"
  | "other";

export function getFileCategory(mimeType: string, fileName: string): FileCategory {
  const mime = (mimeType || "").toLowerCase();
  const ext = (fileName.split(".").pop() || "").toLowerCase();

  if (mime.startsWith("image/") || ["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "ico", "avif"].includes(ext)) {
    return "image";
  }
  if (mime.startsWith("video/") || ["mp4", "webm", "mkv", "mov", "avi", "m4v"].includes(ext)) {
    return "video";
  }
  if (mime.startsWith("audio/") || ["mp3", "wav", "ogg", "flac", "m4a", "aac"].includes(ext)) {
    return "audio";
  }
  if (mime === "application/pdf" || ext === "pdf") {
    return "pdf";
  }
  if (
    mime.includes("zip") ||
    mime.includes("compressed") ||
    mime.includes("tar") ||
    ["zip", "rar", "7z", "tar", "gz", "tgz", "bz2", "xz"].includes(ext)
  ) {
    return "archive";
  }
  if (
    mime.includes("word") ||
    mime.includes("spreadsheet") ||
    mime.includes("presentation") ||
    mime.startsWith("text/") ||
    ["doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "md", "csv", "rtf"].includes(ext)
  ) {
    return "document";
  }
  if (
    ["js", "ts", "tsx", "jsx", "json", "py", "html", "css", "go", "rs", "c", "cpp", "java"].includes(ext)
  ) {
    return "code";
  }
  return "other";
}

