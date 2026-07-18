// Returns the pieces needed to build a translated relative-time phrase,
// rather than a hardcoded English string - English and French pluralize
// differently ("1 hour" vs "2 heures"), so the actual wording is left to
// i18next's plural handling in the component that calls this.
export function getRelativeTimeParts(isoString) {
  if (!isoString) return { key: "unknown" };

  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffMinutes = Math.round(diffMs / 60000);

  if (diffMinutes < 1) return { key: "justNow" };
  if (diffMinutes < 60) return { key: "minutesAgo", count: diffMinutes };

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return { key: "hoursAgo", count: diffHours };

  const diffDays = Math.round(diffHours / 24);
  return { key: "daysAgo", count: diffDays };
}
