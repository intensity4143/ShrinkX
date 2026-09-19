import { useCallback, useEffect, useRef, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  fetchClicksOverTime,
  fetchOverview,
  fetchRecentActivity,
  fetchTopUrls,
  fetchUrlOverview,
} from "../api";

// ── Relative time ─────────────────────────────────────────────────────────────

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ── Data fetching hook ────────────────────────────────────────────────────────

// cache: a ref to a plain object { [key]: data }
// key:   string identifying this fetcher in the cache
// If cached data exists, start with it (no loading flash) and refresh in background.
function useData(fetcher, cache, key) {
  const cached = cache?.current[key] ?? null;
  const [data, setData] = useState(cached);
  const [loading, setLoading] = useState(cached === null);
  const [error, setError] = useState("");
  const fetcherRef = useRef(fetcher);

  useEffect(() => {
    let cancelled = false;
    fetcherRef.current()
      .then((result) => {
        if (cancelled) return;
        if (cache) cache.current[key] = result;
        setData(result);
      })
      .catch((e) => {
        if (cancelled) return;
        // Only surface the error if we have nothing cached to show
        if (!cache?.current[key]) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  return { data, loading, error };
}

// ── Shared primitives ─────────────────────────────────────────────────────────

function Section({ title, children }) {
  return (
    <section className="a-section">
      {title && <h2 className="a-section-title">{title}</h2>}
      {children}
    </section>
  );
}

function StateBlock({ loading, error, empty, children }) {
  if (loading) return <p className="state-text">Loading…</p>;
  if (error) return <p className="error-msg">{error}</p>;
  if (empty) return <p className="state-text">No analytics data yet.</p>;
  return children;
}

// ── Global sections ───────────────────────────────────────────────────────────

function Overview({ cache }) {
  const { data, loading, error } = useData(fetchOverview, cache, "overview");
  const stats = data
    ? [
        { label: "Total URLs", value: data.totalUrls },
        { label: "Total Clicks", value: data.totalClicks },
        { label: "Clicks Today", value: data.clicksToday },
        { label: "Last 7 Days", value: data.clicksLast7Days },
      ]
    : [];

  return (
    <Section title="Overview">
      <StateBlock loading={loading} error={error} empty={!data}>
        <div className="stat-grid">
          {stats.map((s) => (
            <div key={s.label} className="stat-card">
              <span className="stat-value">{s.value.toLocaleString()}</span>
              <span className="stat-label">{s.label}</span>
            </div>
          ))}
        </div>
      </StateBlock>
    </Section>
  );
}

function ClicksChart({ cache }) {
  const { data, loading, error } = useData(fetchClicksOverTime, cache, "clicksOverTime");
  const empty = data && data.length === 0;

  const formatted = data?.map((d) => ({
    clicks: d.clicks,
    // Parse as UTC to avoid off-by-one from local timezone
    date: new Date(d.date + "T00:00:00Z").toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    }),
  }));

  return (
    <Section title="Clicks Over Time">
      <StateBlock loading={loading} error={error} empty={empty}>
        <div className="chart-wrap">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart
              data={formatted}
              margin={{ top: 4, right: 16, left: -16, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12, fill: "var(--text)" }}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 12, fill: "var(--text)" }}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--bg)",
                  border: "1px solid var(--border)",
                  borderRadius: 4,
                  fontSize: 13,
                }}
                cursor={{ stroke: "var(--border)" }}
              />
              <Line
                type="linear"
                dataKey="clicks"
                stroke="var(--accent)"
                strokeWidth={1.5}
                dot={{ r: 3, fill: "var(--accent)", strokeWidth: 0 }}
                activeDot={{ r: 4, strokeWidth: 0 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </StateBlock>
    </Section>
  );
}

function TopUrls({ cache }) {
  const { data, loading, error } = useData(fetchTopUrls, cache, "topUrls");
  const empty = data && data.length === 0;

  return (
    <Section title="Top URLs">
      <StateBlock loading={loading} error={error} empty={empty}>
        <div className="table-wrap">
          <table className="a-table">
            <thead>
              <tr>
                <th>Short Code</th>
                <th>Original URL</th>
                <th>Clicks</th>
                <th>Last Clicked</th>
              </tr>
            </thead>
            <tbody>
              {data?.map((row) => (
                <tr key={row.shortCode}>
                  <td>
                    <code>{row.shortCode}</code>
                  </td>
                  <td className="url-cell" title={row.originalUrl}>
                    <a
                      href={row.originalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {row.originalUrl}
                    </a>
                  </td>
                  <td>{row.clicks.toLocaleString()}</td>
                  <td className="muted">
                    {row.lastClickedAt ? timeAgo(row.lastClickedAt) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </StateBlock>
    </Section>
  );
}

function RecentActivity({ cache }) {
  const { data, loading, error } = useData(fetchRecentActivity, cache, "recentActivity");
  const empty = data && data.length === 0;

  return (
    <Section title="Recent Activity">
      <StateBlock loading={loading} error={error} empty={empty}>
        <div className="activity-list">
          {data?.map((row, i) => (
            <div key={i} className="activity-row">
              <code className="activity-code">{row.shortCode}</code>
              <span className="activity-action">clicked</span>
              <span className="activity-time muted">
                {timeAgo(row.visitedAt)}
              </span>
            </div>
          ))}
        </div>
      </StateBlock>
    </Section>
  );
}

// ── Specific URL overview ─────────────────────────────────────────────────────

function UrlOverview({ shortCode, onClear }) {
  const fetcher = useCallback(() => fetchUrlOverview(shortCode), [shortCode]);
  const { data, loading, error } = useData(fetcher);

  return (
    <div className="url-overview-page">
      <div className="url-overview-header">
        <div>
          <p className="uo-viewing-label">Viewing analytics for</p>
          <code className="uo-viewing-code">{shortCode}</code>
        </div>
        <button className="btn-ghost" onClick={onClear}>
          ← Back to global
        </button>
      </div>

      <StateBlock loading={loading} error={error} empty={!loading && !data && !error}>
        {data && (
          <>
            <div className="uo-meta-block">
              <div className="uo-meta-row">
                <span className="uo-label">Original URL</span>
                <a
                  href={data.originalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="uo-url"
                >
                  {data.originalUrl}
                </a>
              </div>
              {data.lastClickedAt && (
                <div className="uo-meta-row">
                  <span className="uo-label">Last Clicked</span>
                  <span className="uo-value">
                    {new Date(data.lastClickedAt).toLocaleString()}
                  </span>
                </div>
              )}
            </div>

            <div className="stat-grid uo-stat-grid">
              {[
                { label: "Total Clicks", value: data.totalClicks },
                { label: "Today", value: data.todayClicks },
                { label: "Last 7 Days", value: data.last7DaysClicks },
                { label: "Last 30 Days", value: data.last30DaysClicks },
              ].map((s) => (
                <div key={s.label} className="stat-card">
                  <span className="stat-value">{s.value.toLocaleString()}</span>
                  <span className="stat-label">{s.label}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </StateBlock>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Analytics({ cache }) {
  const [input, setInput] = useState("");
  const [activeCode, setActiveCode] = useState("");

  function handleSearch(e) {
    e.preventDefault();
    const code = input.trim();
    if (code) setActiveCode(code);
  }

  function handleClear() {
    setActiveCode("");
    setInput("");
  }

  return (
    <div className="analytics-page">
      <div className="analytics-header">
        <h1 className="page-title">Analytics</h1>
        <form onSubmit={handleSearch} className="search-form">
          <input
            className="search-input"
            placeholder="Search short code…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            spellCheck={false}
          />
          <button type="submit" className="btn-primary">
            Search
          </button>
        </form>
      </div>

      {activeCode ? (
        <UrlOverview key={activeCode} shortCode={activeCode} onClear={handleClear} />
      ) : (
        <>
          <Overview cache={cache} />
          <ClicksChart cache={cache} />
          <TopUrls cache={cache} />
          <RecentActivity cache={cache} />
        </>
      )}
    </div>
  );
}
