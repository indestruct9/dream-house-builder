/**
 * Day16 features added as a floating DOM panel:
 * - Autosave toggle (stores settings in localStorage)
 * - Manual "Trigger Save" which attempts to click the Save Project button in the page
 * - Activity log (local only)
 *
 * This is a standalone script that runs in the browser, manipulating the DOM
 * to add the floating panel.
 */
(function setupDay16Panel() {
  // Avoid attaching multiple panels if file is loaded more than once
  if (typeof window === "undefined") return;
  if (document.getElementById("day16-panel-root")) return;

  // Utilities
  const LS_KEY = "day16_autosave_enabled";
  const LS_INTERVAL_KEY = "day16_autosave_interval_ms";
  const LOG_KEY = "day16_activity_log";

  const createEl = (tag, attrs = {}, children = []) => {
    const el = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => {
      if (k === "style") Object.assign(el.style, v);
      else if (k === "text") el.textContent = v;
      else el.setAttribute(k, v);
    });
    children.forEach((c) => el.appendChild(c));
    return el;
  };

  function addLog(msg) {
    try {
      const ls = JSON.parse(localStorage.getItem(LOG_KEY) || "[]");
      ls.unshift({ ts: Date.now(), msg });
      localStorage.setItem(LOG_KEY, JSON.stringify(ls.slice(0, 200)));
      renderLog();
    } catch (e) {
      // ignore
    }
  }

  function renderLog() {
    const container = document.getElementById("day16-log");
    if (!container) return;
    const ls = JSON.parse(localStorage.getItem(LOG_KEY) || "[]");
    container.innerHTML = "";
    if (ls.length === 0) {
      container.textContent = "No activity yet.";
      return;
    }
    ls.slice(0, 50).forEach((entry) => {
      const d = new Date(entry.ts);
      const row = document.createElement("div");
      row.style.fontSize = "12px";
      row.style.padding = "4px 0";
      row.style.borderBottom = "1px solid rgba(0,0,0,0.04)";
      row.textContent = `${d.toLocaleTimeString()}: ${entry.msg}`;
      container.appendChild(row);
    });
  }

  // Find "Save Project (with thumbnail)" button in the DOM
  function findSaveButton() {
    // heuristics: find by text content;
    const btns = Array.from(document.querySelectorAll("button"));
    for (const b of btns) {
      if (!b.textContent) continue;
      const txt = b.textContent.trim().toLowerCase();
      if (txt.includes("save project") || txt.includes("save. id:") || txt.includes("save project (with thumbnail)")) {
        return b;
      }
    }
    // fallback: button with blue background class
    return document.querySelector('button.bg-blue-600') ||
    null;
  }

  // Attempt to trigger save by clicking the Save button;
  function triggerSaveClick() {
    const btn = findSaveButton();
    if (btn) {
      btn.scrollIntoView({ behavior: "smooth", block: "center" });
      btn.focus();
      btn.click();
      addLog("Triggered save via Save button click.");
      return true;
    } else {
      addLog("Save button not found in DOM.");
      return false;
    }
  }

  // Autosave loop
  let autosaveTimer = null;
  function startAutosave() {
    stopAutosave();
    const enabled = localStorage.getItem(LS_KEY) === "true";
    if (!enabled) return;
    const interval = Number(localStorage.getItem(LS_INTERVAL_KEY) || "30000");
    autosaveTimer = setInterval(() => {
      const did = triggerSaveClick();
      addLog(did ? `Autosave triggered (interval ${interval}ms)` : "Autosave attempted but no Save button");
    }, Math.max(1000, interval));
    addLog("Autosave started.");
  }
  function stopAutosave() {
    if (autosaveTimer) {
      clearInterval(autosaveTimer);
      autosaveTimer = null;
      addLog("Autosave stopped.");
    }
  }

  // Create panel
  const root = createEl("div", {
    id: "day16-panel-root",
    style: {
      position: "fixed",
      right: "18px",
      bottom: "18px",
      width: "300px",
      maxHeight: "60vh",
      overflow: "auto",
      background: "#ffffff",
      border: "1px solid rgba(0,0,0,0.08)",
      borderRadius: "8px",
      boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
      padding: "10px",
      zIndex: 100000,
      fontFamily: "Inter, Arial, sans-serif",
      fontSize: "13px",
      color: "#0b1723"
    }
  });
  const header = createEl("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" } });
  const title = createEl("div", { text: "Day16 — Extras", style: { fontWeight: 700 } });
  const closeBtn = createEl("button", { text: "✕", style: { border: "none", background: "transparent", cursor: "pointer" } });
  closeBtn.onclick = () => { root.style.display = "none"; addLog("Panel closed"); };
  header.appendChild(title);
  header.appendChild(closeBtn);
  // Controls
  const controlsWrap = createEl("div", { style: { marginBottom: "8px" } });
  // Autosave toggle
  const autosaveRow = createEl("div", { style: { display: "flex", gap: "8px", alignItems: "center", marginBottom: "6px" } });
  const autosaveLabel = createEl("label", { text: "Autosave", style: { display: "flex", gap: "8px", alignItems: "center", cursor: "pointer" } });
  const autosaveCheckbox = createEl("input", { type: "checkbox" });
  autosaveCheckbox.checked = localStorage.getItem(LS_KEY) === "true";
  autosaveCheckbox.onchange = (e) => {
    localStorage.setItem(LS_KEY, e.target.checked ? "true" : "false");
    if (e.target.checked) startAutosave(); else stopAutosave();
    addLog(`Autosave ${e.target.checked ? "enabled" : "disabled"}`);
  };
  autosaveLabel.appendChild(autosaveCheckbox);
  autosaveLabel.appendChild(createEl("span", { text: "Enable autosave" }));
  autosaveRow.appendChild(autosaveLabel);
  // Interval input
  const intervalRow = createEl("div", { style: { display: "flex", gap: "8px", alignItems: "center", marginBottom: "6px" } });
  const intervalInput = createEl("input", { type: "number", value: localStorage.getItem(LS_INTERVAL_KEY) || "30000", style: { width: "100px", padding: "6px", borderRadius: "4px", border: "1px solid #e5e7eb" } });
  const intervalSaveBtn = createEl("button", { text: "Set interval", style: { padding: "6px 8px", borderRadius: "6px", border: "none", background: "#111827", color: "#fff", cursor: "pointer" } });
  intervalSaveBtn.onclick = () => {
    const v = Math.max(1000, Number(intervalInput.value) || 30000);
    localStorage.setItem(LS_INTERVAL_KEY, String(v));
    addLog(`Autosave interval set to ${v}ms`);
    if (localStorage.getItem(LS_KEY) === "true") {
      startAutosave();
    }
  };
  intervalRow.appendChild(intervalInput);
  intervalRow.appendChild(intervalSaveBtn);

  // Manual save button
  const manualSaveRow = createEl("div", { style: { display: "flex", gap: "8px", alignItems: "center", marginBottom: "6px" } });
  const manualSaveBtn = createEl("button", { text: "Trigger Save", style: { padding: "8px", borderRadius: "6px", border: "none", background: "#2563eb", color: "#fff", cursor: "pointer", flex: "1" } });
  manualSaveBtn.onclick = () => {
    const ok = triggerSaveClick();
    if (!ok) {
      alert("Couldn't find Save button in DOM. Make sure the Editor is rendered and the Save button text hasn't been changed.");
    }
  };
  manualSaveRow.appendChild(manualSaveBtn);

  // Clear log button
  const clearLogBtn = createEl("button", { text: "Clear log", style: { padding: "6px 8px", borderRadius: "6px", border: "1px solid #e5e7eb", background: "transparent", cursor: "pointer" } });
  clearLogBtn.onclick = () => {
    localStorage.removeItem(LOG_KEY);
    renderLog();
    addLog("Log cleared");
  };
  // Log container
  const logContainer = createEl("div", { id: "day16-log", style: { marginTop: "8px", maxHeight: "220px", overflow: "auto", borderTop: "1px solid rgba(0,0,0,0.04)", paddingTop: "8px" } });
  logContainer.textContent = "No activity yet.";

  // footer small info
  const footer = createEl("div", { style: { marginTop: "8px", fontSize: "11px", color: "#556", textAlign: "right" } });
  footer.textContent = "Day16 • floating tools";

  // Build panel
  controlsWrap.appendChild(autosaveRow);
  controlsWrap.appendChild(intervalRow);
  controlsWrap.appendChild(manualSaveRow);
  controlsWrap.appendChild(clearLogBtn);

  root.appendChild(header);
  root.appendChild(controlsWrap);
  root.appendChild(logContainer);
  root.appendChild(footer);

  document.body.appendChild(root);
  // Ensure autosave state is started if enabled
  if (localStorage.getItem(LS_KEY) === "true") {
    startAutosave();
  }

  // initial render log
  renderLog();

  // Expose small API for debugging from console
  window.__day16 = {
    triggerSaveClick,
    startAutosave,
    stopAutosave,
    addLog,
    renderLog,
  };
  // Announce panel ready
  addLog("Day16 panel initialized.");
})();