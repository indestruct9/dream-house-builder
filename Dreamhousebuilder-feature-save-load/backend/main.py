# backend/main.py
from fastapi import FastAPI, HTTPException, Query, Header, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from pathlib import Path
from fastapi.responses import FileResponse, JSONResponse
import json
import uuid
import base64
import shutil
import hashlib
import os
from datetime import datetime
import asyncio

# Optional Redis async import (for pub/sub across processes)
try:
    import redis.asyncio as aioredis
except Exception:
    aioredis = None

app = FastAPI(title="DreamHouse Backend Day15 (Versions + WebSocket + OpsJournal + Redis)")

# CORS for dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).parent
DATA_DIR = BASE_DIR / "data"
PROJECTS_DIR = DATA_DIR / "projects"
OPS_DIR = DATA_DIR / "ops"
VERSIONS_DIR = DATA_DIR / "versions"   # store versions per project here
PROJECTS_DIR.mkdir(parents=True, exist_ok=True)
OPS_DIR.mkdir(parents=True, exist_ok=True)
VERSIONS_DIR.mkdir(parents=True, exist_ok=True)
DATA_DIR.mkdir(parents=True, exist_ok=True)

USERS_FILE = DATA_DIR / "users.json"
TOKENS_FILE = DATA_DIR / "tokens.json"

REDIS_URL = os.getenv("REDIS_URL")  # set to redis://redis:6379 in docker-compose
REDIS = None
if REDIS_URL and aioredis:
    try:
        REDIS = aioredis.from_url(REDIS_URL, decode_responses=True)
    except Exception as e:
        print("Failed to connect to redis:", e)
        REDIS = None

# ---------------------
# JSON helpers
# ---------------------
def load_json_safe(path: Path):
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}

def write_json_safe(path: Path, data):
    path.write_text(json.dumps(data, indent=2), encoding="utf-8")

# ---------------------
# Auth helpers
# ---------------------
def hash_password(username: str, password: str) -> str:
    return hashlib.sha256(f"{username}|{password}".encode("utf-8")).hexdigest()

def save_token(token: str, username: str):
    tokens = load_json_safe(TOKENS_FILE)
    tokens[token] = {"username": username, "created": datetime.utcnow().isoformat()}
    write_json_safe(TOKENS_FILE, tokens)

def delete_token(token: str):
    tokens = load_json_safe(TOKENS_FILE)
    if token in tokens:
        del tokens[token]
        write_json_safe(TOKENS_FILE, tokens)

def get_username_for_token(token: str) -> Optional[str]:
    tokens = load_json_safe(TOKENS_FILE)
    info = tokens.get(token)
    return info.get("username") if info else None

def get_user_by_username(username: str) -> Optional[Dict[str,Any]]:
    users = load_json_safe(USERS_FILE)
    return users.get(username)

def create_user(username: str, password: str):
    users = load_json_safe(USERS_FILE)
    if username in users:
        raise ValueError("user exists")
    users[username] = {"password_hash": hash_password(username, password), "created": datetime.utcnow().isoformat()}
    write_json_safe(USERS_FILE, users)

# ---------------------
# Project file helpers
# ---------------------
def save_thumbnail(pid: str, thumbnail_b64: str) -> Optional[str]:
    if not thumbnail_b64:
        return None
    try:
        header, b64 = (thumbnail_b64.split(",", 1) if "," in thumbnail_b64 else ("", thumbnail_b64))
        data = base64.b64decode(b64)
        png_path = PROJECTS_DIR / f"{pid}.png"
        with open(png_path, "wb") as pf:
            pf.write(data)
        return f"{pid}.png"
    except Exception as e:
        print("Failed to decode/save thumbnail:", e)
        return None

def write_project_file(pid: str, name: str, layout: Dict[str,Any], owner: Optional[str] = None, thumb_filename: Optional[str] = None):
    out = {"id": pid, "name": name, "layout": layout}
    if owner:
        out["owner"] = owner
    if thumb_filename:
        out["thumbnail"] = thumb_filename
    path = PROJECTS_DIR / f"{pid}.json"
    with open(path, "w", encoding="utf-8") as f:
        json.dump(out, f, indent=2)
    return out

def _project_file_path(project_id: str) -> Path:
    return PROJECTS_DIR / f"{project_id}.json"

def load_project_layout(project_id: str) -> dict:
    path = _project_file_path(project_id)
    if path.exists():
        try:
            j = json.loads(path.read_text(encoding="utf-8"))
            return j.get("layout", {"rooms": [], "meta": {}})
        except Exception:
            return {"rooms": [], "meta": {}}
    return {"rooms": [], "meta": {}}

def persist_project_layout(project_id: str, layout: dict):
    # try preserve name/owner
    path = _project_file_path(project_id)
    if path.exists():
        try:
            existing = json.loads(path.read_text(encoding="utf-8"))
            name = existing.get("name", project_id)
            owner = existing.get("owner")
        except Exception:
            name = project_id
            owner = None
    else:
        name = project_id
        owner = None
    write_project_file(project_id, name, layout, owner=owner, thumb_filename=None)

# ---------------------
# Ops journal helpers (JSONL)
# ---------------------
def append_op_record(project_id: str, record: dict):
    ops_dir = OPS_DIR
    ops_dir.mkdir(parents=True, exist_ok=True)
    fpath = ops_dir / f"{project_id}.log"
    try:
        with open(fpath, "a", encoding="utf-8") as fh:
            fh.write(json.dumps(record) + "\n")
    except Exception as e:
        print("Failed to append op record:", e)

def replay_ops(project_id: str) -> dict:
    """Rebuild layout by replaying ops from ops log. Returns reconstructed layout."""
    fpath = OPS_DIR / f"{project_id}.log"
    layout = {"rooms": [], "meta": {}}
    if not fpath.exists():
        return layout
    try:
        with open(fpath, "r", encoding="utf-8") as fh:
            for line in fh:
                line = line.strip()
                if not line:
                    continue
                try:
                    r = json.loads(line)
                    op = r.get("op")
                    if op:
                        apply_op_to_layout(layout, op)
                except Exception:
                    continue
    except Exception as e:
        print("Failed to replay ops:", e)
    return layout

# ---------------------
# Version helpers (unchanged from Day12)
# ---------------------
def project_json_path(pid: str) -> Path:
    return PROJECTS_DIR / f"{pid}.json"

def project_png_path(pid: str) -> Path:
    return PROJECTS_DIR / f"{pid}.png"

def ensure_versions_dir_for_project(pid: str) -> Path:
    d = VERSIONS_DIR / pid
    d.mkdir(parents=True, exist_ok=True)
    return d

def create_version_from_project(pid: str) -> Optional[str]:
    jpath = project_json_path(pid)
    if not jpath.exists():
        return None
    ver_id = uuid.uuid4().hex
    ver_dir = ensure_versions_dir_for_project(pid)
    with open(jpath, "r", encoding="utf-8") as f:
        data = json.load(f)
    version_meta = {"id": ver_id, "created": datetime.utcnow().isoformat(), "name": data.get("name")}
    vjson_path = ver_dir / f"{ver_id}.json"
    with open(vjson_path, "w", encoding="utf-8") as vf:
        json.dump({"meta": version_meta, "project": data}, vf, indent=2)
    png_path = project_png_path(pid)
    if png_path.exists():
        shutil.copyfile(png_path, ver_dir / f"{ver_id}.png")
    return ver_id

def list_versions_for_project(pid: str):
    ver_dir = VERSIONS_DIR / pid
    if not ver_dir.exists():
        return []
    items = []
    for f in sorted(ver_dir.glob("*.json"), key=lambda p: p.stat().st_mtime, reverse=True):
        try:
            j = json.loads(f.read_text(encoding="utf-8"))
            meta = j.get("meta", {})
            vid = meta.get("id") or f.stem
            created = meta.get("created") or datetime.fromtimestamp(f.stat().st_mtime).isoformat()
            has_thumb = (ver_dir / f"{vid}.png").exists()
            items.append({"version": vid, "created": created, "name": meta.get("name"), "thumbnail": has_thumb})
        except Exception:
            continue
    return items

def get_version_json(pid: str, vid: str):
    vjson = VERSIONS_DIR / pid / f"{vid}.json"
    if not vjson.exists():
        return None
    return json.loads(vjson.read_text(encoding="utf-8"))

def revert_project_to_version(pid: str, vid: str, owner: Optional[str]=None):
    vjson = VERSIONS_DIR / pid / f"{vid}.json"
    if not vjson.exists():
        return False
    data = json.loads(vjson.read_text(encoding="utf-8"))
    project_data = data.get("project")
    if not project_data:
        return False
    jpath = project_json_path(pid)
    with open(jpath, "w", encoding="utf-8") as f:
        if owner:
            project_data["owner"] = owner
        json.dump(project_data, f, indent=2)
    vthumb = VERSIONS_DIR / pid / f"{vid}.png"
    if vthumb.exists():
        dst = project_png_path(pid)
        shutil.copyfile(vthumb, dst)
    return True

# ---------------------
# Models
# ---------------------
class RegisterRequest(BaseModel):
    username: str
    password: str

class LoginRequest(BaseModel):
    username: str
    password: str

class DesignRequest(BaseModel):
    description: Optional[str] = ""
    mood: Optional[str] = "cozy"
    bedrooms: Optional[int] = 2

class SaveProjectRequest(BaseModel):
    name: str
    layout: Dict[str, Any]
    thumbnail: Optional[str] = None

# ---------------------
# Auth wrappers
# ---------------------
def username_from_auth_header(authorization: Optional[str]) -> Optional[str]:
    if not authorization:
        return None
    parts = authorization.split()
    if len(parts) == 2 and parts[0].lower() == "bearer":
        token = parts[1]
        return get_username_for_token(token)
    return None

def require_user(authorization: Optional[str]) -> str:
    username = username_from_auth_header(authorization)
    if not username:
        raise HTTPException(status_code=401, detail="Unauthorized: invalid or missing token")
    return username

# ---------------------
# REST endpoints (unchanged)
# ---------------------
@app.get("/")
def root():
    return {"message": "DreamHouse Backend (Day15) running"}

@app.post("/register")
def register(req: RegisterRequest):
    uname = req.username.strip()
    pwd = req.password.strip()
    if not uname or not pwd:
        raise HTTPException(status_code=400, detail="username and password required")
    if len(uname) < 3 or len(pwd) < 3:
        raise HTTPException(status_code=400, detail="username and password must be >= 3 chars")
    users = load_json_safe(USERS_FILE)
    if uname in users:
        raise HTTPException(status_code=409, detail="user already exists")
    try:
        create_user(uname, pwd)
    except Exception:
        raise HTTPException(status_code=500, detail="failed to create user")
    return {"status":"ok", "username": uname}

@app.post("/login")
def login(req: LoginRequest):
    uname = req.username.strip()
    pwd = req.password.strip()
    user = get_user_by_username(uname)
    if not user:
        raise HTTPException(status_code=401, detail="invalid credentials")
    if user.get("password_hash") != hash_password(uname, pwd):
        raise HTTPException(status_code=401, detail="invalid credentials")
    token = uuid.uuid4().hex
    save_token(token, uname)
    return {"token": token, "username": uname}

@app.post("/logout")
def logout(authorization: Optional[str] = Header(None)):
    uname = username_from_auth_header(authorization)
    if not uname:
        raise HTTPException(status_code=401, detail="no token")
    parts = authorization.split()
    if len(parts) == 2:
        token = parts[1]
        delete_token(token)
    return {"status":"ok"}

# ----- Design generator (public) -----
@app.post("/design")
def design(req: DesignRequest):
    sizes = {"living": 5.0, "kitchen": 3.5, "bed": 3.5, "bath": 2.0}
    rooms = []
    rooms.append({"name": "Living Room", "size": sizes["living"], "x": 0.0, "y": 0.0})
    rooms.append({"name": "Kitchen", "size": sizes["kitchen"], "x": sizes["living"] + 0.5, "y": 0.0})
    for i in range(max(1, int(req.bedrooms or 2))):
        y = (i + 1) * (sizes["bed"] + 0.5)
        rooms.append({"name": f"Bedroom {i+1}", "size": sizes["bed"], "x": 0.0, "y": y})
        rooms.append({"name": f"Bathroom {i+1}", "size": sizes["bath"], "x": sizes["bed"] + 0.5, "y": y})
    meta = {"description": req.description, "mood": req.mood, "bedrooms": req.bedrooms}
    return {"rooms": rooms, "meta": meta}

# ----- Projects (list/view public; save/update/delete protected) -----
@app.get("/projects")
def list_projects(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=200),
    q: Optional[str] = Query(None),
    mine: Optional[bool] = Query(False),
    authorization: Optional[str] = Header(None)
):
    files = sorted(PROJECTS_DIR.glob("*.json"), key=lambda p: p.stat().st_mtime, reverse=True)
    items = []
    for f in files:
        try:
            j = json.loads(f.read_text(encoding="utf-8"))
            pid = j.get("id")
            name = j.get("name")
            owner = j.get("owner")
            if q:
                ql = q.lower()
                if not (ql in (name or "").lower() or ql in (pid or "").lower() or ql in json.dumps(j.get("layout", "")).lower()):
                    continue
            items.append({
                "id": pid,
                "name": name,
                "owner": owner,
                "thumbnail": (PROJECTS_DIR / f"{pid}.png").exists(),
                "thumbnail_url": f"/projects/{pid}/thumbnail" if (PROJECTS_DIR / f"{pid}.png").exists() else None,
                "updated": datetime.fromtimestamp(f.stat().st_mtime).isoformat()
            })
        except Exception:
            continue

    if mine:
        username = username_from_auth_header(authorization)
        if not username:
            raise HTTPException(status_code=401, detail="Unauthorized (mine=true requires login)")
        items = [it for it in items if it.get("owner") == username]

    total = len(items)
    start = (page - 1) * limit
    end = start + limit
    page_items = items[start:end]
    return {"projects": page_items, "page": page, "limit": limit, "total": total}

@app.get("/projects/{project_id}")
def get_project(project_id: str):
    path = PROJECTS_DIR / f"{project_id}.json"
    if not path.exists():
        raise HTTPException(status_code=404, detail="Project not found")
    return json.loads(path.read_text(encoding="utf-8"))

@app.get("/projects/{project_id}/thumbnail")
def get_thumbnail(project_id: str):
    png_path = PROJECTS_DIR / f"{project_id}.png"
    if not png_path.exists():
        raise HTTPException(status_code=404, detail="Thumbnail not found")
    return FileResponse(path=str(png_path), media_type="image/png", filename=png_path.name)

@app.post("/save-project")
def save_project(req: SaveProjectRequest, authorization: Optional[str] = Header(None)):
    username = require_user(authorization)
    pid = uuid.uuid4().hex
    thumb_name = None
    if req.thumbnail:
        thumb_name = save_thumbnail(pid, req.thumbnail)
    out = write_project_file(pid, req.name, req.layout, owner=username, thumb_filename=thumb_name)
    return {"status": "ok", "id": pid}

@app.put("/projects/{project_id}")
def update_project(project_id: str, req: SaveProjectRequest, authorization: Optional[str] = Header(None)):
    username = require_user(authorization)
    path = PROJECTS_DIR / f"{project_id}.json"
    if not path.exists():
        raise HTTPException(status_code=404, detail="Project not found")
    j = json.loads(path.read_text(encoding="utf-8"))
    owner = j.get("owner")
    if owner != username:
        raise HTTPException(status_code=403, detail="Forbidden: you do not own this project")
    create_version_from_project(project_id)
    thumb_name = None
    if req.thumbnail:
        thumb_name = save_thumbnail(project_id, req.thumbnail)
    out = write_project_file(project_id, req.name, req.layout, owner=username, thumb_filename=thumb_name)
    return {"status": "updated", "id": project_id}

@app.delete("/projects/{project_id}")
def delete_project(project_id: str, authorization: Optional[str] = Header(None)):
    username = require_user(authorization)
    jpath = PROJECTS_DIR / f"{project_id}.json"
    if not jpath.exists():
        raise HTTPException(status_code=404, detail="Project not found")
    j = json.loads(jpath.read_text(encoding="utf-8"))
    owner = j.get("owner")
    if owner != username:
        raise HTTPException(status_code=403, detail="Forbidden: you do not own this project")
    ppath = PROJECTS_DIR / f"{project_id}.png"
    try:
        jpath.unlink()
    except Exception as e:
        return JSONResponse(status_code=500, content={"detail": f"Failed to delete json: {e}"})
    if ppath.exists():
        try:
            ppath.unlink()
        except Exception as e:
            return JSONResponse(status_code=500, content={"detail": f"Deleted json but failed to delete thumbnail: {e}"})
    return {"status": "deleted", "id": project_id}

@app.post("/projects/{project_id}/duplicate")
def duplicate_project(project_id: str, authorization: Optional[str] = Header(None)):
    username = require_user(authorization)
    src = PROJECTS_DIR / f"{project_id}.json"
    if not src.exists():
        raise HTTPException(status_code=404, detail="Source project not found")
    try:
        j = json.loads(src.read_text(encoding="utf-8"))
        new_id = uuid.uuid4().hex
        name = j.get("name", "") + " (copy)"
        layout = j.get("layout", {})
        thumb_name = None
        src_thumb = PROJECTS_DIR / f"{project_id}.png"
        if src_thumb.exists():
            dst_thumb = PROJECTS_DIR / f"{new_id}.png"
            shutil.copyfile(src_thumb, dst_thumb)
            thumb_name = f"{new_id}.png"
        write_project_file(new_id, name, layout, owner=username, thumb_filename=thumb_name)
        return {"status": "duplicated", "id": new_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to duplicate: {e}")

# ----- Version endpoints -----
@app.get("/projects/{project_id}/versions")
def get_versions(project_id: str):
    items = list_versions_for_project(project_id)
    return {"versions": items}

@app.get("/projects/{project_id}/versions/{version_id}")
def get_version(project_id: str, version_id: str):
    j = get_version_json(project_id, version_id)
    if not j:
        raise HTTPException(status_code=404, detail="Version not found")
    return j

@app.get("/projects/{project_id}/versions/{version_id}/thumbnail")
def get_version_thumbnail(project_id: str, version_id: str):
    vpng = VERSIONS_DIR / project_id / f"{version_id}.png"
    if not vpng.exists():
        raise HTTPException(status_code=404, detail="Version thumbnail not found")
    return FileResponse(path=str(vpng), media_type="image/png", filename=vpng.name)

@app.post("/projects/{project_id}/versions/{version_id}/revert")
def revert_version(project_id: str, version_id: str, authorization: Optional[str] = Header(None)):
    username = require_user(authorization)
    jpath = PROJECTS_DIR / f"{project_id}.json"
    if not jpath.exists():
        raise HTTPException(status_code=404, detail="Project not found")
    j = json.loads(jpath.read_text(encoding="utf-8"))
    owner = j.get("owner")
    if owner != username:
        raise HTTPException(status_code=403, detail="Forbidden: not your project")
    ok = revert_project_to_version(project_id, version_id, owner=username)
    if not ok:
        raise HTTPException(status_code=500, detail="Failed to revert to version")
    return {"status": "reverted", "id": project_id, "version": version_id}

# ---------------------
# In-memory rooms for WS (multi-room)
# ---------------------
PROJECT_ROOMS: Dict[str, Dict[str, Any]] = {}
SUBSCRIBE_TASKS: Dict[str, asyncio.Task] = {}

def get_or_create_room(project_id: str) -> Dict[str, Any]:
    if project_id not in PROJECT_ROOMS:
        PROJECT_ROOMS[project_id] = {
            "connections": set(),
            "clients_meta": {},
            "layout": load_project_layout(project_id),
            "lock": asyncio.Lock(),
        }
    return PROJECT_ROOMS[project_id]

# ---------------------
# Apply op to layout (same logic used by replay)
# ---------------------
def apply_op_to_layout(layout: dict, op: dict) -> None:
    if not layout:
        layout = {"rooms": [], "meta": {}}
    kind = op.get("kind")
    if kind == "room:add":
        room = op.get("room", {})
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
        found = False
        for i, r in enumerate(layout.get("rooms", [])):
            if r.get("name") == name:
                new_room = dict(r)
                for k, v in updated.items():
                    new_room[k] = v
                layout["rooms"][i] = new_room
                found = True
                break
        if not found:
            layout.setdefault("rooms", []).append(updated)
    # else ignore unknown kinds

# ---------------------
# Redis pub/sub subscriber loop
# ---------------------
async def _redis_subscriber_loop(project_id: str):
    """Subscribe to Redis channel project:{project_id} and forward messages to local connections."""
    if not REDIS:
        return
    channel = f"project:{project_id}"
    pubsub = REDIS.pubsub()
    await pubsub.subscribe(channel)
    try:
        while True:
            # get_message returns dict or None
            try:
                msg = await pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
                if msg and msg.get("type") == "message":
                    data_raw = msg.get("data")
                    try:
                        data = json.loads(data_raw)
                    except Exception:
                        continue
                    room = PROJECT_ROOMS.get(project_id)
                    if not room:
                        continue
                    stale = []
                    for conn in list(room["connections"]):
                        try:
                            await conn.send_json(data)
                        except Exception:
                            stale.append(conn)
                    for sconn in stale:
                        room["connections"].discard(sconn)
                await asyncio.sleep(0.01)
            except asyncio.CancelledError:
                break
            except Exception:
                await asyncio.sleep(0.1)
    finally:
        try:
            await pubsub.unsubscribe(channel)
        except Exception:
            pass
        try:
            await pubsub.close()
        except Exception:
            pass

async def _redis_publish(project_id: str, message: dict):
    if not REDIS:
        return
    channel = f"project:{project_id}"
    try:
        await REDIS.publish(channel, json.dumps(message))
    except Exception as e:
        print("redis publish failed:", e)

# ---------------------
# WebSocket endpoint for projects
# ---------------------
@app.websocket("/ws/projects/{project_id}")
async def project_ws(websocket: WebSocket, project_id: str, token: Optional[str] = Query(None)):
    """
    WebSocket endpoint:
      ws://host:port/ws/projects/{project_id}?token=<token>
    token is optional for dev but will be validated if provided.
    """
    await websocket.accept()
    room = get_or_create_room(project_id)
    room["connections"].add(websocket)

    # start redis subscriber loop for this project if needed
    if REDIS and project_id not in SUBSCRIBE_TASKS:
        SUBSCRIBE_TASKS[project_id] = asyncio.create_task(_redis_subscriber_loop(project_id))

    # derive user id
    username = None
    if token:
        username = get_username_for_token(token)
    user_id = username or str(uuid.uuid4())
    display_name = username or f"Guest-{user_id[:6]}"

    room["clients_meta"][user_id] = {"userId": user_id, "displayName": display_name, "joinedAt": datetime.utcnow().isoformat()}

    # send initial snapshot (canonical layout)
    try:
        await websocket.send_json({"type": "snapshot", "layout": room["layout"], "clients": list(room["clients_meta"].values()), "ts": datetime.utcnow().isoformat()})
    except Exception as ex:
        print("Failed to send snapshot:", ex)

    # broadcast joined to others
    join_msg = {"type": "joined", "userId": user_id, "displayName": display_name, "ts": datetime.utcnow().isoformat()}
    stale = []
    for conn in list(room["connections"]):
        if conn is websocket:
            continue
        try:
            await conn.send_json(join_msg)
        except Exception:
            stale.append(conn)
    for s in stale:
        room["connections"].discard(s)

    try:
        while True:
            raw = await websocket.receive_text()
            try:
                data = json.loads(raw)
            except Exception:
                continue

            mtype = data.get("type")
            if mtype == "ping":
                await websocket.send_json({"type": "pong", "ts": datetime.utcnow().isoformat()})
            elif mtype == "presence":
                # broadcast presence to others
                presence_msg = {"type": "presence", "userId": user_id, "cursor": data.get("cursor"), "meta": data.get("meta"), "ts": datetime.utcnow().isoformat()}
                # apply to clients_meta
                meta = room["clients_meta"].get(user_id, {})
                if data.get("meta"):
                    meta.update(data.get("meta"))
                    room["clients_meta"][user_id] = meta
                # broadcast locally
                stale = []
                for conn in list(room["connections"]):
                    if conn is websocket:
                        continue
                    try:
                        await conn.send_json(presence_msg)
                    except Exception:
                        stale.append(conn)
                for s in stale:
                    room["connections"].discard(s)
                # publish to redis for remote workers
                await _redis_publish(project_id, presence_msg)
            elif mtype == "op":
                op = data.get("op")
                op_id = data.get("opId") or str(uuid.uuid4())
                ts = data.get("ts") or datetime.utcnow().isoformat()
                # append op record
                op_record = {"opId": op_id, "from": user_id, "ts": ts, "op": op}
                try:
                    append_op_record(project_id, op_record)
                except Exception as ex:
                    print("append op failed:", ex)
                # apply under lock
                async with room["lock"]:
                    apply_op_to_layout(room["layout"], op)
                    try:
                        persist_project_layout(project_id, room["layout"])
                    except Exception as ex:
                        print("persist failed after op:", ex)
                # broadcast op to all local conns
                broadcast_msg = {"type": "op", "opId": op_id, "from": user_id, "ts": ts, "op": op}
                stale = []
                for conn in list(room["connections"]):
                    try:
                        await conn.send_json(broadcast_msg)
                    except Exception:
                        stale.append(conn)
                for s in stale:
                    room["connections"].discard(s)
                # publish to redis so other workers forward to their local sockets
                await _redis_publish(project_id, broadcast_msg)
            elif mtype == "save":
                # explicit save request
                async with room["lock"]:
                    try:
                        persist_project_layout(project_id, room["layout"])
                        await websocket.send_json({"type": "ack", "what": "save", "ts": datetime.utcnow().isoformat()})
                    except Exception as ex:
                        await websocket.send_json({"type": "error", "msg": f"save failed: {ex}"})
            elif mtype == "join":
                # client sends extra metadata upon join
                meta = data.get("meta", {})
                room["clients_meta"].setdefault(user_id, {}).update(meta)
            else:
                # unknown type -> ignore
                try:
                    await websocket.send_json({"type": "error", "msg": f"unknown type {mtype}"})
                except Exception:
                    pass

    except WebSocketDisconnect:
        # cleanup
        try:
            room["connections"].discard(websocket)
        except Exception:
            pass
        room["clients_meta"].pop(user_id, None)
        left_msg = {"type": "left", "userId": user_id, "displayName": display_name, "ts": datetime.utcnow().isoformat()}
        stale = []
        for conn in list(room["connections"]):
            try:
                await conn.send_json(left_msg)
            except Exception:
                stale.append(conn)
        for s in stale:
            room["connections"].discard(s)

        # if no connections left, persist and optionally cleanup
        if len(room["connections"]) == 0:
            try:
                persist_project_layout(project_id, room["layout"])
            except Exception as ex:
                print("Failed to persist layout on empty room:", ex)
            # optionally cancel redis subscriber when no more local conns
            if project_id in SUBSCRIBE_TASKS:
                task = SUBSCRIBE_TASKS.pop(project_id, None)
                if task:
                    try:
                        task.cancel()
                    except Exception:
                        pass
        return

# End of file
