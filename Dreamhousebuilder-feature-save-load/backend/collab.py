# backend/collab.py
import asyncio
import json
import os
import time
import uuid
from typing import Dict, Set, Any

from fastapi import WebSocket, WebSocketDisconnect

# --- Configuration (adjust to your project) ---
PROJECT_STORAGE_DIR = os.path.join(os.path.dirname(__file__), "projects")  # where project JSONs live
os.makedirs(PROJECT_STORAGE_DIR, exist_ok=True)

# In-memory sessions map: project_id -> ProjectRoom
PROJECT_ROOMS: Dict[str, "ProjectRoom"] = {}
ROOMS_LOCK = asyncio.Lock()  # guards PROJECT_ROOMS creation

def _project_file_path(project_id: str) -> str:
    return os.path.join(PROJECT_STORAGE_DIR, f"{project_id}.json")

def load_project_layout(project_id: str) -> dict:
    path = _project_file_path(project_id)
    if os.path.exists(path):
        try:
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f).get("layout", {"rooms": [], "meta": {}})
        except Exception:
            return {"rooms": [], "meta": {}}
    return {"rooms": [], "meta": {}}

def persist_project_layout(project_id: str, layout: dict) -> None:
    path = _project_file_path(project_id)
    with open(path, "w", encoding="utf-8") as f:
        json.dump({"layout": layout, "savedAt": time.time()}, f, indent=2)

# --- ProjectRoom manages connections + in-memory canonical layout ---
class ProjectRoom:
    def __init__(self, project_id: str):
        self.project_id = project_id
        self.connections: Set[WebSocket] = set()
        self.clients_meta: Dict[str, dict] = {}  # userId -> metadata like displayName, lastSeen
        self.layout = load_project_layout(project_id)
        self.lock = asyncio.Lock()  # serialize applying ops to layout
        self.last_ts = time.time()

    async def broadcast(self, message: dict, exclude: WebSocket = None):
        text = json.dumps(message)
        stale = []
        for ws in list(self.connections):
            if ws is exclude:
                continue
            try:
                await ws.send_text(text)
            except Exception:
                # mark stale to remove
                stale.append(ws)
        for s in stale:
            try:
                self.connections.remove(s)
            except Exception:
                pass

# --- helpers to get or create ProjectRoom ---
async def get_or_create_room(project_id: str) -> ProjectRoom:
    async with ROOMS_LOCK:
        if project_id not in PROJECT_ROOMS:
            PROJECT_ROOMS[project_id] = ProjectRoom(project_id)
        return PROJECT_ROOMS[project_id]

# --- apply op (simple per-field LWW semantics) ---
def apply_op_to_layout(layout: dict, op: dict) -> None:
    """
    op examples:
      { kind: "room:add", room: { name, x, y, size, ... } }
      { kind: "room:update", room: { name, x?, y?, size?, rotationY?, scale? } }
      { kind: "room:remove", name: "Room 1" }
    This function mutates layout in-place.
    """
    kind = op.get("kind")
    if kind == "room:add":
        room = op.get("room", {})
        # avoid duplicate names: if exists, ignore (or you could suffix)
        if not any(r.get("name") == room.get("name") for r in layout.get("rooms", [])):
            layout.setdefault("rooms", []).append(room)
    elif kind == "room:remove":
        name = op.get("name")
        layout["rooms"] = [r for r in layout.get("rooms", []) if r.get("name") != name]
    elif kind == "room:update":
        updated = op.get("room", {})
        name = updated.get("name")
        if not name:
            return
        for i, r in enumerate(layout.get("rooms", [])):
            if r.get("name") == name:
                # merge fields (LWW handled in client by ts — server accepts value and applies straightforwardly)
                new_room = dict(r)
                for k, v in updated.items():
                    if k == "name":
                        new_room["name"] = v
                    else:
                        new_room[k] = v
                layout["rooms"][i] = new_room
                return
        # if not found, treat as add
        layout.setdefault("rooms", []).append(updated)

# --- WebSocket endpoint handler (call from main.py) ---
async def websocket_handler(websocket: WebSocket, project_id: str, token: str | None = None):
    """
    Accept a websocket connection and manage message loop for a single project room.
    token is optional and used as userId in development. In prod use a validated JWT.
    """
    await websocket.accept()
    room = await get_or_create_room(project_id)
    room.connections.add(websocket)

    # treat token as userId if provided; else create a transient one
    user_id = token or str(uuid.uuid4())
    # ephemeral displayName
    display_name = f"User-{user_id[:6]}"

    # register client meta
    room.clients_meta[user_id] = {"displayName": display_name, "joinedAt": time.time()}
    # send snapshot + current presence
    snapshot_msg = {"type": "snapshot", "layout": room.layout, "clients": list(room.clients_meta.values()), "ts": time.time()}
    await websocket.send_text(json.dumps(snapshot_msg))

    # notify others about join
    await room.broadcast({"type": "joined", "userId": user_id, "displayName": display_name}, exclude=websocket)

    try:
        while True:
            raw = await websocket.receive_text()
            data = json.loads(raw)
            mtype = data.get("type")
            if mtype == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))
            elif mtype == "presence":
                # broadcast to others
                await room.broadcast({
                    "type": "presence",
                    "userId": user_id,
                    "cursor": data.get("cursor"),
                    "ts": time.time()
                }, exclude=websocket)
            elif mtype == "op":
                op = data.get("op")
                op_id = data.get("opId") or str(uuid.uuid4())
                ts = data.get("ts") or time.time()
                # apply op under lock, update room canonical layout
                async with room.lock:
                    apply_op_to_layout(room.layout, op)
                    room.last_ts = ts
                # broadcast to all (including origin — client will ack or ignore duplicate)
                broadcast_msg = {
                    "type": "op",
                    "opId": op_id,
                    "from": user_id,
                    "ts": ts,
                    "op": op
                }
                await room.broadcast(broadcast_msg, exclude=None)
            elif mtype == "save":
                # persist canonical layout to disk
                async with room.lock:
                    persist_project_layout(project_id, room.layout)
                await websocket.send_text(json.dumps({"type": "ack", "what": "save", "ts": time.time()}))
            else:
                # unknown message - ignore or reply
                await websocket.send_text(json.dumps({"type": "error", "msg": f"unknown type {mtype}"}))
    except WebSocketDisconnect:
        # remove
        try:
            room.connections.remove(websocket)
        except Exception:
            pass
        if user_id in room.clients_meta:
            meta = room.clients_meta.pop(user_id, None)
            await room.broadcast({"type": "left", "userId": user_id, "displayName": display_name})
        # optional: if no connections left for project, persist and remove room after a timeout
        if len(room.connections) == 0:
            # persist immediately (safer)
            persist_project_layout(project_id, room.layout)
            # don't remove from PROJECT_ROOMS immediately; can implement timeout cleanup if desired
