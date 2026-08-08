const DEFAULT_API_BASE_URL =
  typeof window !== "undefined" && import.meta.env.DEV
    ? `${window.location.protocol}//${window.location.hostname}:8081`
    : "https://cms.penielchristianchurchkitui.com/";

export const getApiBaseUrl = () => {
  const configured = import.meta.env.VITE_API_BASE_URL?.trim();
  if (configured) {
    return configured.endsWith("/") ? configured : `${configured}/`;
  }
  return DEFAULT_API_BASE_URL;
};
