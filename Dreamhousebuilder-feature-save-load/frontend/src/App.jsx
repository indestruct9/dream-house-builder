import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import Editor from "src/pages/Editor";
import Login from "src/pages/Login";
import Signup from "src/pages/Signup";
import Dashboard from "src/pages/Dashboard";
import AuthGate from "src/components/AuthGate";
import Extras from "src/pages/Extras";
import { ToastProvider } from "src/components/ToastContext";

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
      <div className="app-header p-4 flex items-center justify-between">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link to="/" style={{ textDecoration: "none", color: "inherit" }}>
            <div className="brand-title">DreamHouse</div>
          </Link>
          <nav className="small-muted" style={{ display: "flex", gap: 10 }}>
            <Link to="/dashboard" className="btn-soft">Dashboard</Link>
            <Link to="/editor" className="btn-soft">Editor</Link>
          </nav>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Link to="/login" className="btn-soft">Login</Link>
          <Link to="/signup" className="btn-coffee">Sign up</Link>
        </div>
      </div>

      <main style={{ padding: 20 }}>
        <Routes>
          <Route path="/" element={<AuthGate />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/editor" element={<Editor />} />
          <Route path="/extras" element={<Extras />} />
        </Routes>
      </main>
      </ToastProvider>
    </BrowserRouter>
  );
}
