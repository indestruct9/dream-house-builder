// frontend/src/services/collab.js
// Collab client for Day15
// - reconnecting websocket (uses ReconnectingWebSocket if available)
// - ping/pong heartbeat
// - sendOp returns a Promise that resolves when an 'op' with same opId is received
// - presence sending
// - join announcement on open

/* Note: this file expects ReconnectingWebSocket to be available in your project.
   If you don't have it, fallback will use native WebSocket with no auto-reconnect.
   Install: npm i reconnecting-websocket
*/

let ReconnectingWebSocketLib = null;
try {
  // dynamic require so it won't crash in environments where library not installed
  ReconnectingWebSocketLib = require("reconnecting-websocket").default || require("reconnecting-websocket");
} catch (e) {
  ReconnectingWebSocketLib = null;
}

const DEFAULT_WS_HOST = (() => {
  if (typeof window === "undefined") return "ws://localhost:8000";
  const loc = window.location;
  const proto = loc.protocol === "https:" ? "wss" : "ws";
  const host = loc.hostname;
  // assume backend on :8000 (adjust if different)
  return `${proto}://${host}:8000`;
})();

export default class CollabClient {
  constructor({ projectId, token = null, onSnapshot, onOp, onPresence, onJoined, onLeft, onOpen, reconnectInterval = 2000 }) {
    this.projectId = projectId;
    this.token = token || localStorage.getItem("token") || null;
    this.onSnapshot = onSnapshot || (() => {});
    this.onOp = onOp || (() => {});
    this.onPresence = onPresence || (() => {});
    this.onJoined = onJoined || (() => {});
    this.onLeft = onLeft || (() => {});
    this.onOpen = onOpen || (() => {});
    this.reconnectInterval = reconnectInterval;

    this.outstandingOps = new Map(); // opId -> resolve
    this.clientId = this.token || this._randomId();
    this.socket = null;
    this._heartbeatTimer = null;
    this._connected = false;

    this._connect();
  }

  _randomId() {
    return Math.random().toString(36).slice(2, 9);
  }

  _buildUrl() {
    const t = encodeURIComponent(this.token || "");
    return `${DEFAULT_WS_HOST}/ws/projects/${this.projectId}?token=${t}`;
  }

  _connect() {
    const url = this._buildUrl();
    if (ReconnectingWebSocketLib) {
      const options = { connectionTimeout: 4000, maxRetries: 1000, maxReconnectionDelay: 10000 };
      this.socket = new ReconnectingWebSocketLib(url, [], options);
      this.socket.addEventListener("open", () => this._onopen());
      this.socket.addEventListener("message", (evt) => this._onmessage(evt));
      this.socket.addEventListener("close", () => this._onclose());
      this.socket.addEventListener("error", (e) => console.warn("WS error", e));
    } else {
      // fallback: basic WebSocket with naive reconnect
      this._nativeConnect(url);
    }
  }

  _nativeConnect(url) {
    try {
      this.socket = new WebSocket(url);
    } catch (e) {
      console.error("WebSocket connect failed:", e);
      setTimeout(() => this._nativeConnect(url), this.reconnectInterval);
      return;
    }
    this.socket.addEventListener("open", () => this._onopen());
    this.socket.addEventListener("message", (evt) => this._onmessage(evt));
    this.socket.addEventListener("close", () => {
      this._onclose();
      setTimeout(() => this._nativeConnect(url), this.reconnectInterval);
    });
    this.socket.addEventListener("error", (e) => console.warn("WS error", e));
  }

  _onopen() {
    this._connected = true;
    this.onOpen();
    // announce join
    this.send({ type: "join", meta: { clientId: this.clientId } });
    // start heartbeat
    this._startHeartbeat();
  }

  _onclose() {
    this._connected = false;
    this._stopHeartbeat();
  }

  _startHeartbeat() {
    this._stopHeartbeat();
    this._heartbeatTimer = setInterval(() => {
      try {
        this.send({ type: "ping" });
      } catch (e) {}
    }, 20000);
  }

  _stopHeartbeat() {
    if (this._heartbeatTimer) {
      clearInterval(this._heartbeatTimer);
      this._heartbeatTimer = null;
    }
  }

  _onmessage(evt) {
    let data;
    try {
      data = (typeof evt.data === "string") ? JSON.parse(evt.data) : evt.data;
    } catch (e) {
      return;
    }
    const t = data.type;
    if (t === "snapshot") {
      this.onSnapshot(data.layout || {}, data.clients || []);
    } else if (t === "op") {
      // matched an outstanding op?
      const opId = data.opId;
      if (opId && this.outstandingOps.has(opId)) {
        const { resolve } = this.outstandingOps.get(opId);
        resolve && resolve(data);
        this.outstandingOps.delete(opId);
      }
      this.onOp(data);
    } else if (t === "presence") {
      this.onPresence(data);
    } else if (t === "joined") {
      this.onJoined(data);
    } else if (t === "left") {
      this.onLeft(data);
    } else if (t === "pong") {
      // noop
    } else if (t === "ack") {
      // generic ack
    } else if (t === "error") {
      console.warn("Server error:", data.msg);
    } else {
      // unknown types: pass to onOp fallback
      this.onOp(data);
    }
  }

  send(raw) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      // If ReconnectingWebSocket is used, it will queue automatically; otherwise we ignore.
      if (this.socket && this.socket.bufferedAmount === 0) {
        // no-op
      } else {
        // ignore if not open
        console.warn("WebSocket not open, ignoring send:", raw);
        return;
      }
    }
    try {
      this.socket.send(JSON.stringify(raw));
    } catch (e) {
      console.warn("Send failed:", e);
    }
  }

  sendOp(op) {
    const opId = op.opId || ("op_" + Math.random().toString(36).slice(2,9));
    const msg = { type: "op", opId, userId: this.clientId, ts: Date.now()/1000, op };
    return new Promise((resolve, reject) => {
      // store resolver so when server echoes op with same opId we can resolve
      this.outstandingOps.set(opId, { op, resolve, reject, sentAt: Date.now() });
      this.send(msg);
      // timeout fallback in case server doesn't respond
      setTimeout(() => {
        if (this.outstandingOps.has(opId)) {
          const s = this.outstandingOps.get(opId);
          this.outstandingOps.delete(opId);
          // resolve anyway (best-effort)
          resolve({ timedOut: true, opId });
        }
      }, 7000);
    });
  }

  sendPresence(cursor) {
    this.send({ type: "presence", cursor, meta: { clientId: this.clientId } });
  }

  requestSave() {
    this.send({ type: "save" });
  }

  close() {
    try {
      this._stopHeartbeat();
      if (this.socket) {
        try { this.socket.close(); } catch (e) {}
      }
    } catch (e) {}
  }
}
