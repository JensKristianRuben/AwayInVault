export function getSearchParam(key) {
  if (typeof window === "undefined") {
    return "";
  }

  const urlParams = new URLSearchParams(window.location.search);
  const value = urlParams.get(key);

  return value || "";
}
