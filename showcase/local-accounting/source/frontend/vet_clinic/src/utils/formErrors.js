export function firstErrorMessage(value, fallback = "انجام عملیات ناموفق بود.") {
  if (typeof value === "string" && value.trim()) return value;
  if (Array.isArray(value)) {
    for (const item of value) {
      const message = firstErrorMessage(item, "");
      if (message) return message;
    }
  } else if (value && typeof value === "object") {
    for (const key of ["detail", "error", ...Object.keys(value)]) {
      const message = firstErrorMessage(value[key], "");
      if (message) return message;
    }
  }
  return fallback;
}
