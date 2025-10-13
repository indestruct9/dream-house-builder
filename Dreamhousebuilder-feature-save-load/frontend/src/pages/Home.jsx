import React from "react";
import { Link } from "react-router-dom";

export default function Home() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const target = token ? "/editor" : "/login";
  const label = token ? "Open Editor" : "Get started";

  return (
    <div className="hero-card">
      <div className="hero-content">
        <h1 className="brand-title">🏡 DreamHouse AI Builder</h1>
        <p className="hero-sub">Design your custom dream house using AI and 3D models.</p>
        <div style={{ marginTop: 18 }}>
          <Link to={target} className="btn-coffee">{label}</Link>
        </div>
      </div>
    </div>
  );
}
