export function formatCompactCount(count: number) {
  if (count < 100) {
    return `${count}`;
  }

  if (count < 1000) {
    return "100+";
  }

  if (count < 10000) {
    return `${Math.floor(count / 1000)}K+`;
  }

  if (count < 1000000) {
    return `${Math.floor(count / 1000)}K+`;
  }

  return `${Math.floor(count / 1000000)}M+`;
}

export function formatRelativeTime(timestamp: string) {
  const diff = Date.now() - new Date(timestamp).getTime();
  const minutes = Math.floor(diff / 1000 / 60);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 60 * 24) return `${Math.floor(minutes / 60)}h ago`;
  if (minutes < 60 * 24 * 7) return `${Math.floor(minutes / (60 * 24))}d ago`;

  return new Date(timestamp).toLocaleDateString();
}

export function formatDateTime(timestamp: string) {
  return new Date(timestamp).toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatFileSize(bytes?: number | null) {
  const safeBytes = Math.max(0, bytes || 0);

  if (safeBytes < 1024) {
    return `${safeBytes} B`;
  }

  if (safeBytes < 1024 * 1024) {
    return `${(safeBytes / 1024).toFixed(1)} KB`;
  }

  if (safeBytes < 1024 * 1024 * 1024) {
    return `${(safeBytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  return `${(safeBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function truncateText(value: string, maxLength = 340) {
  if (value.length <= maxLength) {
    return {
      text: value,
      truncated: false,
    };
  }

  return {
    text: `${value.slice(0, maxLength).trimEnd()}...`,
    truncated: true,
  };
}
