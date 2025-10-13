import React from "react";
import { Link } from "react-router-dom";

export default function Extras() {
  return (
    <div className="p-8 card" style={{ maxWidth: 900, margin: '24px auto' }}>
      <h2 className="section-title">Extras & Tools</h2>
      <p className="muted">Small utilities and experimental features live here.</p>
      <div style={{ marginTop: 12 }}>
        <Link to="/" className="btn-soft">Home</Link>
        <Link to="/editor" className="btn-coffee-ghost" style={{ marginLeft: 8 }}>Go to Editor</Link>
      </div>
    </div>
  );
}
