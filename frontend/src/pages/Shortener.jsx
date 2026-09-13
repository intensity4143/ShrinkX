import { useState } from "react";
import { generateShortUrl } from "../api";

export default function Shortener() {
  const [url, setUrl] = useState("");
  const [shortUrl, setShortUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setShortUrl("");
    setLoading(true);
    try {
      const result = await generateShortUrl(url.trim());
      setShortUrl(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(shortUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
              <button className="btn-copy" onClick={handleCopy}>
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
