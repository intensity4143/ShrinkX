const BASE = import.meta.env.VITE_API_BASE_URL || "";

async function request(path, options) {
  const res = await fetch(`${BASE}${path}`, options);
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.message || "Request failed");
  return data;
}

// Backend returns { success, message, shortUrl } — not nested under result
export const generateShortUrl = async (originalUrl) => {
  const data = await request("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ originalUrl }),
  });
  return data.shortUrl;
};

const result = (path) => () => request(path).then((d) => d.result);

export const fetchOverview = result("/api/analytics/overview");
export const fetchClicksOverTime = result("/api/analytics/clicks-over-time");
export const fetchTopUrls = result("/api/analytics/top-urls");
export const fetchRecentActivity = result("/api/analytics/recent-activity");
export const fetchUrlOverview = (shortCode) =>
  request(`/api/analytics/url-overview/${shortCode}`).then((d) => d.result);
export const fetchAnalytics = (shortCode) =>
  request(`/api/analytics/${shortCode}`).then((d) => d.result);
