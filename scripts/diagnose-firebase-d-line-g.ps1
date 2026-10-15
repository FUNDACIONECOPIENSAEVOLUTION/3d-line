#requires -Version 5.1
<#
.SYNOPSIS
  Diagnostico SOLO LECTURA de Firebase para 3 LINE-AR (proyecto d-line-g).
.DESCRIPTION
  No crea proyectos, apps, colecciones, bases ni reglas; no despliega.
  Requiere cuenta Firebase autorizada. No imprime tokens ni claves privadas.
#>
$ErrorActionPreference = 'Stop'
$project = 'd-line-g'
Write-Host '\n3 LINE-AR | Diagnostico Firebase SOLO LECTURA' -ForegroundColor Cyan
Write-Host "Proyecto de destino: $project" -ForegroundColor Green

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw 'Node.js no esta disponible. Instala una version LTS >=20.'
}
if (-not (Get-Command npx -ErrorAction SilentlyContinue)) {
  throw 'npx no esta disponible. Verifica la instalacion de Node.js/npm.'
}

Write-Host '\n[1/5] Version Node.js'
node --version
Write-Host '\n[2/5] Version Firebase CLI'
npx -y firebase-tools@latest --version
if ($LASTEXITCODE -ne 0) { throw 'Fallo la CLI de Firebase.' }

Write-Host '\n[3/5] Cuentas conectadas a Firebase CLI'
npx -y firebase-tools@latest login:list
if ($LASTEXITCODE -ne 0) {
  Write-Warning 'No hay sesion verificada. Ejecuta: npx -y firebase-tools@latest login'
  exit 1
}

Write-Host '\n[4/5] Proyectos a los que tiene acceso tu usuario'
npx -y firebase-tools@latest projects:list
if ($LASTEXITCODE -ne 0) {
  Write-Warning 'No se pudo listar proyectos. Verifica acceso Google e Internet.'
  exit 1
}

Write-Host "\n[5/5] Aplicaciones WEB y bases Firestore de $project"
npx -y firebase-tools@latest apps:list --project $project
if ($LASTEXITCODE -ne 0) {
  Write-Warning "No se pudieron consultar las apps de $project. Revisa ID y permisos."
  exit 1
}
npx -y firebase-tools@latest firestore:databases:list --project $project
if ($LASTEXITCODE -ne 0) {
  Write-Warning 'No se pudo listar Firestore. Puede no estar activado o faltar permisos.'
}

Write-Host '\nDiagnostico completado. No se ha modificado ningun recurso Firebase.' -ForegroundColor Green
Write-Host 'Para confirmar una App WEB, copia su App ID (no los tokens de acceso).'
