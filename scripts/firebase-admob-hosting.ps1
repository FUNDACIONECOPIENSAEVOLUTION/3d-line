#requires -Version 5.1
<#
.SYNOPSIS
 Comprueba la configuración de Firebase Hosting para AdMob.
.DESCRIPTION
 Por defecto NO despliega ni cambia recursos remotos. Para publicar se requiere
 -Deploy y una confirmación explícita. El contenido se aloja en d-line-g.web.app
 (si el sitio Firebase Hosting por defecto existe o se aprovisiona).
 No modifica Firestore, Authentication ni GitHub Pages.
.EXAMPLE
 .\scripts\firebase-admob-hosting.ps1
 .\scripts\firebase-admob-hosting.ps1 -PublisherId "pub-1234567890123456"
 .\scripts\firebase-admob-hosting.ps1 -Deploy
#>
[CmdletBinding()]
param(
 [ValidatePattern('^(?:(?:ca-)?pub-)?\d{16}$')]
 [string]$PublisherId,
 [switch]$Deploy
)
$ErrorActionPreference = 'Stop'
$project = 'd-line-g'
$siteFolder = Join-Path $PSScriptRoot '..\firebase-admob-site'
$publicFolder = Join-Path $siteFolder 'public'
$adsFile = Join-Path $publicFolder 'app-ads.txt'
$siteUrl = "https://$project.web.app"
Write-Host "3 LINE-AR | Firebase Hosting para AdMob" -ForegroundColor Cyan
Write-Host "Proyecto: $project" -ForegroundColor Green
Write-Host "Sitio previsto: $siteUrl (NO supone que ya exista)" -ForegroundColor Yellow

if (-not (Get-Command node -ErrorAction SilentlyContinue) -or -not (Get-Command npx -ErrorAction SilentlyContinue)){
 throw 'Instala Node.js LTS (node y npx) antes de continuar.'
}
Write-Host "Node: $(node --version)"
Write-Host 'Comprobando Firebase CLI y sesión...'
& npx -y firebase-tools@latest --version
if ($LASTEXITCODE -ne 0){throw 'Firebase CLI no pudo ejecutarse.'}
& npx -y firebase-tools@latest login:list
if ($LASTEXITCODE -ne 0){
 throw 'No hay sesión Firebase CLI. Ejecuta npx -y firebase-tools@latest login, autoriza tu cuenta y vuelve a ejecutar este script.'
}
Write-Host 'Sitios Firebase Hosting visibles en d-line-g (solo lectura):' -ForegroundColor Cyan
& npx -y firebase-tools@latest hosting:sites:list --project $project
if ($LASTEXITCODE -ne 0){
 throw 'No se pudieron consultar los sitios Hosting. Comprueba que tienes permisos y que Hosting está habilitado en d-line-g.'
}

if ($PublisherId){
 $pub = $PublisherId -replace '^(ca-)?pub-',''
 $line = "google.com, pub-$pub, DIRECT, f08c47fec0942fa0"
 Set-Content -Path $adsFile -Value $line -Encoding Ascii -NoNewline
 Write-Host 'Se generó localmente public/app-ads.txt con el ID proporcionado. Verifícalo con AdMob antes de publicar.' -ForegroundColor Green
}else{
 if(Test-Path $adsFile){
  Write-Warning 'Ya existe public/app-ads.txt. Verifica que contenga el publisher ID correcto y vigente antes de publicar.'
 }else{
  Write-Host 'Sin ID de editor: NO se genera app-ads.txt falso.' -ForegroundColor Yellow
 }
}
Write-Host 'El sitio del juego en GitHub Pages no se modifica.' -ForegroundColor Cyan
if(-not $Deploy){
 Write-Host 'LISTO PARA REVISAR. Todavía NO se publicó Firebase Hosting.' -ForegroundColor Green
 Write-Host 'Para publicar conscientemente: .\scripts\firebase-admob-hosting.ps1 -Deploy'
 exit 0
}
Write-Warning 'ATENCIÓN: Firebase deploy reemplaza el contenido de la versión ACTUAL del sitio Hosting predeterminado d-line-g.'
Write-Warning 'Si ese Hosting aloja otra web, CANCELA y revisa el contenido actual en la consola antes de seguir.'
$answer=Read-Host 'Para confirmar escribe exactamente PUBLICAR d-line-g'
if($answer -cne 'PUBLICAR d-line-g'){
 Write-Host 'Operación cancelada: no se desplegó nada.' -ForegroundColor Yellow
 exit 0
}
Push-Location $siteFolder
try{
 & npx -y firebase-tools@latest deploy --only hosting --project $project --config firebase.json
 if ($LASTEXITCODE -ne 0){throw 'El despliegue a Firebase Hosting falló. Consulta la salida anterior.'}
 Write-Host "Sitio esperado: $siteUrl" -ForegroundColor Green
 if(Test-Path $adsFile){Write-Host "Comprueba el archivo público: $siteUrl/app-ads.txt"}
 else {Write-Host 'app-ads.txt permanece pendiente hasta conocer el publisher ID REAL de AdMob.' -ForegroundColor Yellow}
}finally{Pop-Location}
