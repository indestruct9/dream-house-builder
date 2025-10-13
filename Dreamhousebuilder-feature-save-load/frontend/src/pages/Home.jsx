import React from "react";
import { Link, useNavigate } from "react-router-dom";

export default function Home() {
  const navigate = typeof window !== 'undefined' ? useNavigate() : null;
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const target = token ? "/editor" : "/login";
  const label = token ? "Open Editor" : "Get started";

  return (
    <div style={{ position: 'relative' }}>
      {/* Fixed button group (Day17 dashboard actions) */}
      <div style={{ position: 'fixed', top: 16, right: 16, display: 'flex', gap: 8, zIndex: 1000 }}>
        <button
          onClick={() => navigate('/dashboard')}
          className="btn-soft"
        >
          Open Dashboard
        </button>
        <button
          onClick={() => {
            const id = prompt('Enter projectId to load:');
            if (id) {
              localStorage.setItem('loadedProjectId', id);
              window.location.href = '/editor';
            }
          }}
          className="btn-soft"
        >
          Load projectId
        </button>
        <button
          onClick={() => {
            localStorage.removeItem('token');
            localStorage.removeItem('username');
            window.location.href = '/login';
          }}
          className="btn-soft"
        >
          Logout
        </button>
        <button onClick={() => alert('Day17 • Projects & Dashboard\n\nHelp: Use the buttons to manage your projects.')} className="btn-soft">Help</button>
      </div>

      <div className="p-8 text-center card" style={{ maxWidth: 800, margin: '24px auto' }}>
        <h1 className="brand-title">🏡 DreamHouse AI Builder</h1>
        <p className="muted mt-3">Design your custom dream house using AI and 3D models.</p>
        <div className="mt-6">
          <Link to={target} className="btn-coffee">{label}</Link>
        </div>
      </div>
    </div>
  );
}
