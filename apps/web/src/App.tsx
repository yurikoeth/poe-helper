import { Routes, Route, Link } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Characters from "./pages/Characters";

export default function App() {
  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav
        className="border-b px-6 py-3 flex items-center gap-6"
        style={{
          backgroundColor: "var(--bg-secondary)",
          borderColor: "var(--border-color)",
        }}
      >
        <Link to="/" className="text-lg font-bold" style={{ color: "var(--accent)" }}>
          PoE Helper
        </Link>
        <Link to="/" className="text-sm hover:opacity-80" style={{ color: "var(--text-secondary)" }}>
          Dashboard
        </Link>
        <Link to="/characters" className="text-sm hover:opacity-80" style={{ color: "var(--text-secondary)" }}>
          Characters
        </Link>
      </nav>

      {/* Routes */}
      <main className="p-6">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/characters" element={<Characters />} />
        </Routes>
      </main>
    </div>
  );
}
