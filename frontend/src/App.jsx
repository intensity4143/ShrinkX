import { useRef } from "react";
import { NavLink, Route, Routes } from "react-router-dom";
import Shortener from "./pages/Shortener";
import Analytics from "./pages/Analytics";
import "./App.css";

export default function App() {
  // Persists across Analytics unmount/remount; plain object so writes never
  // trigger a re-render of App itself.
  const analyticsCache = useRef({});

  return (
    <>
      <header className="nav">
        <span className="nav-brand">ShrinkX</span>
        <nav className="nav-links">
          <NavLink to="/" end className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
            Shortener
          </NavLink>
          <NavLink to="/analytics" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
            Analytics
          </NavLink>
        </nav>
      </header>

      <main className="main-content">
        <Routes>
          <Route path="/" element={<Shortener />} />
          <Route path="/analytics" element={<Analytics cache={analyticsCache} />} />
        </Routes>
      </main>
    </>
  );
}
