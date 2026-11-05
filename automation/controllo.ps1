# controllo.ps1 - controllo rapido del template PRIMA di pubblicare (circa 10 secondi). Uso, dalla cartella della repo:
#   powershell -NoProfile -ExecutionPolicy Bypass -File automation\controllo.ps1
# Verifica: JS senza errori di sintassi, admin che si avvia, JSON validi, traduzioni allineate, residui di altri siti,
# graffe chiuse dentro {{ }} (errore che rompe la build). Alla fine stampa TUTTO OK oppure l'elenco dei problemi.
# File ASCII di proposito (PowerShell 5 legge male gli accenti senza BOM).
$ErrorActionPreference = 'Continue'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
$err = @()

# 1) sintassi JS (node). Salta se node manca.
if (Get-Command node -ErrorAction SilentlyContinue) {
  foreach ($f in Get-ChildItem admin\js, assets\js -Filter *.js -ErrorAction SilentlyContinue) {
    $o = node --check $f.FullName 2>&1; if ($LASTEXITCODE -ne 0) { $err += "JS: $($f.Name) $($o | Select-Object -First 1)" }
  }
  # 2) l'admin si avvia e le categorie si vedono (simulazione, non serve la build)
  if (Test-Path automation\test_admin.js) { $o = node automation\test_admin.js 2>&1; if (-not ($o -match 'ADMIN OK')) { $err += "ADMIN: test_admin.js non OK: $($o | Select-Object -Last 1)" } }
} else { Write-Host 'node non trovato: salto controlli JS' }

# 3) JSON dei dati validi
foreach ($f in Get-ChildItem _data -Recurse -Filter *.json -ErrorAction SilentlyContinue) {
  try { Get-Content $f.FullName -Raw -Encoding UTF8 | ConvertFrom-Json | Out-Null } catch { $err += "JSON non valido: $($f.FullName.Replace($root + '\', ''))" }
}

# 4) traduzioni: deve dire 0
if (Get-Command python -ErrorAction SilentlyContinue) {
  $o = (python automation\traduzioni_sync.py 2>&1 | Select-Object -Last 1)
  if ($o -notmatch ':\s*0\s*$') { $err += "TRADUZIONI: $o (se hai gia' tradotto: python automation\allinea_hash.py en)" }
}

# 5) residui di altri siti e graffa chiusa in {{ }}
$files = Get-ChildItem -Recurse -File -Include *.html,*.md,*.yml,*.json,*.js,*.css,*.scss | Where-Object { $_.FullName -notmatch '\\\.git\\|\\docs\\|catalogo|AGENTS|CLAUDE|PROGETTO|ERRORI|RICETTE|MAPPA|controllo\.ps1' }
# CRITICO: cerca nomi di ALTRI siti rimasti per sbaglio nel template (es. un testo copiato da edilextreme). Esempio di errore: 'RESIDUO: _pages/chi-siamo.md:12'.
# 'webtomars' NON e' nel pattern: e' il credito del footer (_includes/footer/custom.html) voluto in tutti i siti. Se lo rimetti, il controllo fallisce sempre.
foreach ($m in ($files | Select-String -Pattern '(?i)gamingcorp|edilextreme|ferrucci|florbook|ipermark' | Select-Object -First 8)) { $err += "RESIDUO: $($m.Path.Replace($root + '\', '')):$($m.LineNumber)" }
foreach ($m in ($files | Where-Object { $_.Extension -eq '.html' } | Select-String -Pattern "\{\{\s*'\}'\s*\}\}" | Select-Object -First 5)) { $err += "LIQUID: graffa chiusa in {{ }} in $($m.Path.Replace($root + '\', '')):$($m.LineNumber)" }

Write-Host '--- git status'; git status --short
if ($err.Count -eq 0) { Write-Host 'TUTTO OK' -ForegroundColor Green } else { Write-Host 'PROBLEMI:' -ForegroundColor Red; $err | ForEach-Object { Write-Host " - $_" } }
