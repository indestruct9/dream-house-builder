This script downloads a small set of CC0 glTF sample models into the frontend public models folder so the app's GLB-first previews will show real furniture.

Usage (from project root in PowerShell):

    .\scripts\fetch-furniture-models.ps1

Notes:
- The script attempts to download a handful of models from the Khronos glTF-Sample-Models repo. Some model names or paths may differ; if a download fails, check the repo at:
  https://github.com/KhronosGroup/glTF-Sample-Models/tree/main/2.0
- Files are saved as `frontend/public/models/furniture/{key}.glb`, where `key` is one of: `sofa`, `chair`, `lamp`, `table`, `bed`.
- After running the script, start the frontend dev server (`npm install` then `npm run dev` inside `frontend`) and open the gallery. The "View in 3D" modal will prefer the downloaded GLB for rendering.
