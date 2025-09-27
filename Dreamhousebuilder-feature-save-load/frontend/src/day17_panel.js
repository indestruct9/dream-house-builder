/**
 * Day17 panel: Dashboard integration, Project picker, Login/Logout, My Projects list, Duplicate/Delete/Open actions.
 * This is a standalone script that runs in the browser.
 */

(function setupDay17Panel() {
  if (typeof window === "undefined") return;
  if (document.getElementById("day17-panel-root")) return;

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

  const root = createEl("div", {
    id: "day17-panel-root",
    style: {
      position: "fixed",
      left: "18px",
      bottom: "18px",
      width: "360px",
      maxHeight: "70vh",
      overflow: "auto",
      background: "#fffafc",
      border: "1px solid rgba(0,0,0,0.06)",
      borderRadius: "10px",
      padding: "12px",
      zIndex: 100001,
      fontFamily: "Inter, Arial, sans-serif",
      fontSize: "13px",
      color: "#0b1723",
      boxShadow: "0 10px 30px rgba(0,0,0,0.08)"
    }
  });
  const header = createEl("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" } });
  const title = createEl("div", { text: "Day17 • Dashboard", style: { fontWeight: 800 } });
  const hideBtn = createEl("button", { text: "−", style: { border: "none", background: "transparent", cursor: "pointer", fontSize: "18px" } });
  const toggleBtn = createEl("button", { text: "✕", style: { border: "none", background: "transparent", cursor: "pointer", fontSize: "14px" } });
  hideBtn.onclick = () => {
    const body = document.getElementById("day17-body");
    if (body) {
      body.style.display = body.style.display === "none" ? "block" : "none";
      hideBtn.textContent = body.style.display === "none" ? "+" : "−";
    }
  };
  toggleBtn.onclick = () => {
    root.style.display = "none";
  };
  header.appendChild(title);
  const hRight = createEl("div", { style: { display: "flex", gap: "8px", alignItems: "center" } });
  hRight.appendChild(hideBtn);
  hRight.appendChild(toggleBtn);
  header.appendChild(hRight);
  // Body
  const body = createEl("div", { id: "day17-body", style: { display: "block" } });
  // Auth info
  const authRow = createEl("div", { style: { display: "flex", gap: "8px", alignItems: "center", marginBottom: "8px" } });
  const userSpan = createEl("div", { id: "day17-user", text: "Not logged in", style: { fontWeight: 600, flex: "1" } });
  const loginBtn = createEl("button", { text: "Login", style: { padding: "6px 8px", borderRadius: "6px", border: "none", background: "#2563eb", color: "#fff", cursor: "pointer" } });
  const logoutBtn = createEl("button", { text: "Logout", style: { padding: "6px 8px", borderRadius: "6px", border: "none", background: "#ef4444", color: "#fff", cursor: "pointer", display: "none" } });
  loginBtn.onclick = () => {
    window.location.href = "/login";
  };
  logoutBtn.onclick = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      alert("No active session.");
      return;
    }
    try {
      await fetch("/logout", { method: "POST", headers: { Authorization: `Bearer ${token}` } }).catch(()=>{});
    } catch(e){}
    localStorage.removeItem("token");
    userSpan.textContent = "Not logged in";
    loginBtn.style.display = "";
    logoutBtn.style.display = "none";
    renderProjects([]);
    alert("Logged out");
  };

  authRow.appendChild(userSpan);
  authRow.appendChild(loginBtn);
  authRow.appendChild(logoutBtn);

  // Controls: Load My Projects, Open Dashboard
  const controls = createEl("div", { style: { display: "flex", gap: "8px", marginBottom: "8px" } });
  const myProjectsBtn = createEl("button", { text: "My Projects", style: { padding: "6px 8px", borderRadius: "6px", border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer" } });
  const dashboardBtn = createEl("button", { text: "Open Dashboard", style: { padding: "6px 8px", borderRadius: "6px", border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer" } });
  const forceLoadBtn = createEl("button", { text: "Load projectId", style: { padding: "6px 8px", borderRadius: "6px", border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer" } });
  controls.appendChild(myProjectsBtn);
  controls.appendChild(dashboardBtn);
  controls.appendChild(forceLoadBtn);

  // Projects list container
  const projectsContainer = createEl("div", { id: "day17-projects", style: { borderTop: "1px solid rgba(0,0,0,0.04)", paddingTop: "8px", maxHeight: "300px", overflow: "auto" } });
  // Footer small
  const footer = createEl("div", { style: { marginTop: "8px", fontSize: "12px", color: "#666", display: "flex", justifyContent: "space-between", alignItems: "center" } });
  const hint = createEl("div", { text: "Day17 • Projects & Dashboard" });
  const helpBtn = createEl("button", { text: "Help", style: { padding: "4px 8px", borderRadius: "6px", border: "1px solid #e5e7eb", background: "transparent", cursor: "pointer" } });
  helpBtn.onclick = () => {
    alert("Day17 panel: Use 'My Projects' to fetch your saved projects (requires login). Click Open to load in Editor. Duplicate/Delete are available for owned projects.");
  };
  footer.appendChild(hint);
  footer.appendChild(helpBtn);

  body.appendChild(authRow);
  body.appendChild(controls);
  body.appendChild(projectsContainer);
  body.appendChild(footer);

  root.appendChild(header);
  root.appendChild(body);
  document.body.appendChild(root);
  // Helper to render a list of projects
  function renderProjects(list) {
    projectsContainer.innerHTML = "";
    if (!list || list.length === 0) {
      const empty = createEl("div", { text: "No projects to show.", style: { color: "#666", padding: "8px" } });
      projectsContainer.appendChild(empty);
      return;
    }
    list.forEach((p) => {
      const row = createEl("div", { style: { display: "flex", gap: "8px", padding: "8px", borderBottom: "1px solid rgba(0,0,0,0.03)", alignItems: "center" } });
      const thumb = createEl("div", { style: { width: 72, height: 56, background: "#fafafa", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "6px", overflow: "hidden", border: "1px solid #eee" } });
      if (p.thumbnail_url) {
        const img = createEl("img", { src: p.thumbnail_url, style: { width: "100%", height: "100%", objectFit: "cover" } });
        thumb.appendChild(img);
      } else {
        thumb.appendChild(createEl("div", { text: "No thumb", style: { color: "#888", fontSize: "12px" } }));
      }
      const meta = createEl("div", { style: { flex: 1 } });
      meta.appendChild(createEl("div", { text: p.name || "Untitled", style: { fontWeight: 700 } }));
      meta.appendChild(createEl("div", { text: `id: ${p.id}`, style: { fontSize: "11px", color: "#666" } }));
      meta.appendChild(createEl("div", { text: `owner: ${p.owner || "public"}`, style: { fontSize: "11px", color: "#666" } }));
      const actions = createEl("div", { style: { display: "flex", gap: "6px" } });
      const openBtn = createEl("button", { text: "Open", style: { padding: "6px 8px", borderRadius: "6px", border: "none", background: "#10b981", color: "#fff", cursor: "pointer" } });
      const delBtn = createEl("button", { text: "Delete", style: { padding: "6px 8px", borderRadius: "6px", border: "none", background: "#ef4444", color: "#fff", cursor: "pointer", display: p.owner ? "" : "none" } });
      const dupBtn = createEl("button", { text: "Duplicate", style: { padding: "6px 8px", borderRadius: "6px", border: "none", background: "#2563eb", color: "#fff", cursor: "pointer" } });
      openBtn.onclick = () => {
        localStorage.setItem("loadedProjectId", p.id);
        fetchProjectAndLoad(p.id);
      };
      delBtn.onclick = async () => {
        const ok = confirm("Delete this project? This cannot be undone.");
        if (!ok) return;
        await deleteProject(p.id);
      };
      dupBtn.onclick = async () => {
        await duplicateProject(p.id);
      };

      actions.appendChild(openBtn);
      actions.appendChild(dupBtn);
      actions.appendChild(delBtn);

      row.appendChild(thumb);
      row.appendChild(meta);
      row.appendChild(actions);
      projectsContainer.appendChild(row);
    });
  }

  async function apiGet(path, token) {
    const headers = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch(path, { headers });
    if (res.status === 401) throw new Error("Unauthorized");
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }
  async function apiPost(path, body, token) {
    const headers = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch(path, { method: "POST", headers, body: JSON.stringify(body) });
    if (res.status === 401) throw new Error("Unauthorized");
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }
  async function apiDelete(path, token) {
    const headers = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch(path, { method: "DELETE", headers });
    if (res.status === 401) throw new Error("Unauthorized");
    if (!res.ok) throw new Error(await res.text());
    try { return await res.json(); } catch(e){ return null; }
  }

  myProjectsBtn.onclick = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      alert("You must be logged in to fetch your projects. Redirecting to login page.");
      window.location.href = "/login";
      return;
    }
    userSpan.textContent = "Loading...";
    try {
      const data = await apiGet(`/projects?mine=true`, token);
      renderProjects(data.projects || []);
      userSpan.textContent = `Logged in`;
      loginBtn.style.display = "none";
      logoutBtn.style.display = "";
    } catch (err) {
      console.error("Failed to fetch my projects", err);
      if ((err && err.message && err.message.toLowerCase().includes("unauthorized")) || err.status === 401) {
        alert("Session expired. Please login again.");
        localStorage.removeItem("token");
        userSpan.textContent = "Not logged in";
        loginBtn.style.display = "";
        logoutBtn.style.display = "none";
      } else {
        alert("Failed to fetch projects: " + (err.message || err));
      }
      renderProjects([]);
    }
  };
  dashboardBtn.onclick = () => {
    window.location.href = "/dashboard";
  };
  forceLoadBtn.onclick = async () => {
    const id = prompt("Enter project id to load into editor:");
    if (!id) return;
    await fetchProjectAndLoad(id);
  };

  async function fetchProjectAndLoad(id) {
    try {
      const res = await apiGet(`/projects/${id}`, localStorage.getItem("token"));
      if (!res || !res.layout) {
        alert("Invalid project data received.");
        return;
      }
      localStorage.setItem("loadedLayout", JSON.stringify(res.layout));
      localStorage.setItem("loadedProjectId", id);
      try {
        window.dispatchEvent(new CustomEvent("dreamhouse:loadedProject", { detail: { id, layout: res.layout } }));
      } catch (e) {}
      setTimeout(() => {
        if (!document.querySelector(".ThreeDViewer, [data-three-viewer]")) {
          window.location.reload();
        } else {
          window.location.reload();
        }
      }, 350);
    } catch (err) {
      console.error("Failed to fetch project", err);
      alert("Failed to load project: " + (err.message || err));
    }
  }

  async function deleteProject(id) {
    const token = localStorage.getItem("token");
    if (!token) {
      alert("You must be logged in to delete projects.");
      return;
    }
    try {
      await apiDelete(`/projects/${id}`, token);
      alert("Deleted " + id);
      myProjectsBtn.click();
    } catch (err) {
      console.error("Delete failed", err);
      alert("Delete failed: " + (err.message || err));
    }
  }

  async function duplicateProject(id) {
    const token = localStorage.getItem("token");
    if (!token) {
      alert("You must be logged in to duplicate projects.");
      return;
    }
    try {
      const res = await apiPost(`/projects/${id}/duplicate`, {}, token);
      alert("Duplicated to id: " + (res.id || "unknown"));
      myProjectsBtn.click();
    } catch (err) {
      console.error("Duplicate failed", err);
      alert("Duplicate failed: " + (err.message || err));
    }
  }

  (function initAuthState() {
    const token = localStorage.getItem("token");
    if (token) {
      userSpan.textContent = "Logged in";
      loginBtn.style.display = "none";
      logoutBtn.style.display = "";
    } else {
      userSpan.textContent = "Not logged in";
      loginBtn.style.display = "";
      logoutBtn.style.display = "none";
    }
  })();
  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.addedNodes && m.addedNodes.length) {
        for (const n of m.addedNodes) {
          if (n.nodeType === 1 && n.textContent && n.textContent.includes("Saved")) {
            if (projectsContainer) {
              setTimeout(() => {
                if (projectsContainer && projectsContainer.children.length > 0) {
                  myProjectsBtn.click();
                }
              }, 1200);
            }
          }
        }
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  window.__day17 = {
    fetchMyProjects: () => myProjectsBtn.click(),
    fetchProject: fetchProjectAndLoad,
    renderProjects,
    duplicateProject,
    deleteProject
  };
  renderProjects([]);
})();