// src/utils/analyticsHelpers.js
export function getMostFrequent(arr = [], key) {
  const counts = {};
  for (const it of arr) {
    const k = it?.[key] || 'unknown';
    counts[k] = (counts[k] || 0) + 1;
  }
  let top = null;
  for (const k of Object.keys(counts)) {
    if (!top || counts[k] > counts[top]) top = k;
  }
  return top ? { key: top, count: counts[top] } : null;
}
