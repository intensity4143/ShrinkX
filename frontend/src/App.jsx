import { NavLink, Route, Routes } from "react-router-dom";
import Shortener from "./pages/Shortener";
import Analytics from "./pages/Analytics";
import "./App.css";

export default function App() {
  return (
    <>
      <header className="nav">
        <span className="nav-brand">Snip</span>
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
          <Route path="/analytics" element={<Analytics />} />
        </Routes>
      </main>
    </>
  );
}
