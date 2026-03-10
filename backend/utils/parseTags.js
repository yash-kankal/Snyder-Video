/**
 * Safely parses tags from a request body field.
 * Accepts a string (comma-separated) or an array.
 */
function parseTags(tags) {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags.map((t) => String(t).trim()).filter(Boolean);
  return String(tags)
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

module.exports = parseTags;
