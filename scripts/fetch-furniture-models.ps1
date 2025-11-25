# Downloads a set of glTF sample .glb furniture models into frontend/public/models/furniture/
# Run from project root in PowerShell (Windows PowerShell 5.1):
#   .\scripts\fetch-furniture-models.ps1

$destDir = "frontend/public/models/furniture"
if (-not (Test-Path $destDir)) {
    New-Item -ItemType Directory -Path $destDir -Force | Out-Null
}

# Map the gallery keys to best-fit sample models. Some sample names differ
# from our catalog; the script will attempt to download available binaries.
$models = @(
    @{ key = "sofa";       repoName = "GlamVelvetSofa";        fileName = "GlamVelvetSofa.glb" },
    @{ key = "armchair";   repoName = "SheenChair";            fileName = "SheenChair.glb" },
    @{ key = "beanbag";    repoName = "SheenCloth";            fileName = "SheenCloth.glb" },
    @{ key = "coffeetable";repoName = "BoxTextured";           fileName = "BoxTextured.glb" },
    @{ key = "sidetable";  repoName = "BoxTextured";           fileName = "BoxTextured.glb" },
    @{ key = "bed";        repoName = "Avocado";               fileName = "Avocado.glb" },
    @{ key = "nightstand"; repoName = "Lantern";              fileName = "Lantern.glb" },
    @{ key = "rug";        repoName = "TwoSidedPlane";         fileName = "TwoSidedPlane.glb" },
    @{ key = "painting";   repoName = "BoxTextured";           fileName = "BoxTextured.glb" },
    @{ key = "plant";      repoName = "Avocado";               fileName = "Avocado.glb" },
    @{ key = "tv";         repoName = "BoomBox";               fileName = "BoomBox.glb" },
    @{ key = "lamp";       repoName = "IridescenceLamp";       fileName = "IridescenceLamp.glb" }
)

$baseRaw = "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0"

Write-Host "Starting downloads to: $destDir" -ForegroundColor Cyan

foreach ($m in $models) {
    $outFile = Join-Path $destDir ($m.key + ".glb")
    if (Test-Path $outFile) {
        Write-Host "Skipping (exists): $outFile" -ForegroundColor Yellow
        continue
    }

    $url = "$baseRaw/$($m.repoName)/glTF-Binary/$($m.fileName)"
    Write-Host "Downloading $($m.repoName) -> $outFile" -ForegroundColor Green
    try {
        Invoke-WebRequest -Uri $url -OutFile $outFile -UseBasicParsing -ErrorAction Stop
        Write-Host "Saved: $outFile" -ForegroundColor Green
    }
    catch {
        Write-Host "Failed to download $url. Error: $($_.Exception.Message)" -ForegroundColor Red
        if (Test-Path $outFile) { Remove-Item $outFile -Force }
    }
}

Write-Host "Done. If some downloads failed, open the script and adjust model names or visit the samples repo:" -ForegroundColor Cyan
Write-Host "https://github.com/KhronosGroup/glTF-Sample-Models/tree/main/2.0" -ForegroundColor Cyan
