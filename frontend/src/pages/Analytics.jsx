import { useEffect, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  fetchOverview,
  fetchClicksOverTime,
  fetchTopUrls,
  fetchRecentActivity,
  fetchUrlOverview,
} from "../api";

function useData(fetcher) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetcher()
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return { data, loading, error };
}

function Section({ title, children }) {
  return (
    <section className="a-section">
      <h2 className="a-section-title">{title}</h2>
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

function Overview() {
  const { data, loading, error } = useData(fetchOverview);
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

function ClicksChart() {
  const { data, loading, error } = useData(fetchClicksOverTime);
  const empty = data && data.length === 0;

  const formatted = data?.map((d) => ({
    ...d,
    date: new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
  }));

  return (
    <Section title="Clicks Over Time">
      <StateBlock loading={loading} error={error} empty={empty}>
        <div className="chart-wrap">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={formatted} margin={{ top: 4, right: 16, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fontSize: 12, fill: "var(--text)" }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "var(--text)" }} />
              <Tooltip
                contentStyle={{
                  background: "var(--bg)",
                  border: "1px solid var(--border)",
                  borderRadius: 4,
                  fontSize: 13,
                }}
              />
              <Line
                type="monotone"
                dataKey="clicks"
                stroke="var(--accent)"
                strokeWidth={2}
                dot={{ r: 3, fill: "var(--accent)" }}
                activeDot={{ r: 5 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </StateBlock>
    </Section>
  );
}

function TopUrls() {
  const { data, loading, error } = useData(fetchTopUrls);
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
                  <td><code>{row.shortCode}</code></td>
                  <td className="url-cell">
                    <a href={row.originalUrl} target="_blank" rel="noopener noreferrer">
                      {row.originalUrl}
                    </a>
                  </td>
                  <td>{row.clicks.toLocaleString()}</td>
                  <td>{row.lastClickedAt ? new Date(row.lastClickedAt).toLocaleString() : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </StateBlock>
    </Section>
  );
}

function RecentActivity() {
  const { data, loading, error } = useData(fetchRecentActivity);
  const empty = data && data.length === 0;

  return (
    <Section title="Recent Activity">
      <StateBlock loading={loading} error={error} empty={empty}>
        <div className="table-wrap">
          <table className="a-table">
            <thead>
              <tr>
                <th>Short Code</th>
                <th>Original URL</th>
                <th>Visited At</th>
              </tr>
            </thead>
            <tbody>
              {data?.map((row, i) => (
                <tr key={i}>
                  <td><code>{row.shortCode}</code></td>
                  <td className="url-cell">
                    <a href={row.originalUrl} target="_blank" rel="noopener noreferrer">
                      {row.originalUrl}
                    </a>
                  </td>
                  <td>{new Date(row.visitedAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </StateBlock>
    </Section>
  );
}

function UrlAnalytics() {
  const [input, setInput] = useState("");
  const [shortCode, setShortCode] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    const code = input.trim();
    if (!code) return;
    setShortCode(code);
    setData(null);
    setError("");
    setLoading(true);
    fetchUrlOverview(code)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  return (
    <Section title="URL Analytics">
      <form onSubmit={handleSubmit} className="code-form">
        <input
          className="code-input"
          placeholder="Enter short code, e.g. abc123"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? "Loading…" : "View Analytics"}
        </button>
      </form>

      {error && <p className="error-msg">{error}</p>}

      {data && (
        <div className="url-overview">
          <div className="url-overview-meta">
            <span className="uo-label">Short Code</span>
            <code>{data.shortCode}</code>
          </div>
          <div className="url-overview-meta">
            <span className="uo-label">Original URL</span>
            <a href={data.originalUrl} target="_blank" rel="noopener noreferrer" className="uo-url">
              {data.originalUrl}
            </a>
          </div>
          <div className="uo-stats">
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
        </div>
      )}
    </Section>
  );
}

export default function Analytics() {
  return (
    <div className="analytics-page">
      <h1 className="page-title">Analytics</h1>
      <Overview />
      <ClicksChart />
      <TopUrls />
      <RecentActivity />
      <UrlAnalytics />
    </div>
  );
}
