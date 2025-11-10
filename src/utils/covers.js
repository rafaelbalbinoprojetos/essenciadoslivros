const DRIVE_HOST_SNIPPETS = ["drive.google.com", "docs.google.com"];
const DRIVE_ID_PATTERN = /[-\w]{10,}/;

function buildDriveDirectUrl(id) {
  return `https://drive.google.com/uc?id=${id}&export=view`;
}

function extractDriveId(text = "") {
  if (!text) return "";
  const match = text.match(DRIVE_ID_PATTERN);
  return match ? match[0] : "";
}

function isRemoteUrl(value) {
  return /^https?:\/\//i.test(value);
}

function normalizeDriveUrl(value) {
  try {
    const url = new URL(value);
    if (DRIVE_HOST_SNIPPETS.some((host) => url.hostname.includes(host))) {
      const idFromQuery = url.searchParams.get("id");
      const idFromPath = extractDriveId(url.pathname);
      const fileId = idFromQuery || idFromPath;
      if (fileId) {
        return buildDriveDirectUrl(fileId);
      }
    }
    return url.href;
  } catch {
    return value;
  }
}

/**
 * Normalizes cover URLs so that we can embed them without running into Drive redirects
 * or whitespace issues. Accepts full URLs, bare IDs or relative file names.
 */
export function normalizeCoverUrl(rawValue) {
  const value = typeof rawValue === "string" ? rawValue.trim() : "";
  if (!value) return "";

  if (value.startsWith("//")) {
    return normalizeCoverUrl(`https:${value}`);
  }

  if (value.startsWith("drive.google.com") || value.startsWith("docs.google.com")) {
    return normalizeCoverUrl(`https://${value}`);
  }

  if (isRemoteUrl(value)) {
    return normalizeDriveUrl(value);
  }

  const bareId = extractDriveId(value);
  if (bareId && bareId.length === value.length) {
    return buildDriveDirectUrl(bareId);
  }

  return value;
}
