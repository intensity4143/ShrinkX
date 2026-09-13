import { useState } from "react";
import { generateShortUrl } from "../api";

const STORAGE_KEY = "snip_recent_urls";
const MAX_RECENT = 5;

function loadRecent() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveRecent(urls) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(urls));
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  function handleCopy() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button className="btn-copy" onClick={handleCopy}>
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

export default function Shortener() {
  const [url, setUrl] = useState("");
  const [shortUrl, setShortUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [recent, setRecent] = useState(loadRecent);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setShortUrl("");
    setLoading(true);
    try {
      const result = await generateShortUrl(url.trim());
      setShortUrl(result);
      // Persist: prepend, deduplicate, cap at MAX_RECENT
      const updated = [result, ...loadRecent().filter((u) => u !== result)].slice(0, MAX_RECENT);
      saveRecent(updated);
      setRecent(updated);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-center">
      <div className="shortener-card">
        <h1 className="shortener-title">URL Shortener</h1>
        <p className="shortener-sub">Paste a long URL to get a short link.</p>

        <form onSubmit={handleSubmit} className="shortener-form">
          <input
            type="url"
            className="url-input"
            placeholder="https://example.com/very/long/url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
          />
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Shortening…" : "Shorten URL"}
          </button>
        </form>

        {error && <p className="error-msg">{error}</p>}

        {shortUrl && (
          <div className="result-box">
            <span className="result-label">Your shortened URL</span>
            <div className="result-row">
              <a href={shortUrl} target="_blank" rel="noopener noreferrer" className="result-url">
                {shortUrl}
              </a>
              <CopyButton text={shortUrl} />
            </div>
          </div>
        )}

        {recent.filter((u) => u !== shortUrl).length > 0 && (
          <div className="recent-box">
            <span className="result-label">Recently generated</span>
            {recent.filter((u) => u !== shortUrl).map((u) => (
              <div key={u} className="result-row recent-row">
                <a href={u} target="_blank" rel="noopener noreferrer" className="result-url">
                  {u}
                </a>
                <CopyButton text={u} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
