const DRIVE_ID_PATTERN = /[-\w]{10,}/;
const DRIVE_HOSTS = ["drive.google.com", "docs.google.com", "drive.usercontent.google.com", "drive.googleusercontent.com"];

function extractDriveId(value = "") {
  const match = value.match(DRIVE_ID_PATTERN);
  return match ? match[0] : "";
}

function buildDriveProxyUrl(fileId) {
  return `/api/media/audio?id=${encodeURIComponent(fileId)}`;
}

export function buildAudioSource(rawValue) {
  const value = typeof rawValue === "string" ? rawValue.trim() : "";
  if (!value) return "";

  try {
    const url = new URL(value);
    if (DRIVE_HOSTS.some((host) => url.hostname.includes(host))) {
      const id = url.searchParams.get("id") ?? extractDriveId(url.pathname);
      if (id) {
        return buildDriveProxyUrl(id);
      }
    }
  } catch {
    const id = extractDriveId(value);
    if (id) {
      return buildDriveProxyUrl(id);
    }
  }

  return value;
}
