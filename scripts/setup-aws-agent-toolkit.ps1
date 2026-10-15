#Requires -Version 5.1
<#
  Instala AWS CLI/uv si el usuario lo autoriza; configura AWS Agent Toolkit para Codex y otros agentes.
  Ejecutar en PowerShell DEL PROPIO USUARIO (no en servidores de ChatGPT).
  No pide llaves AWS. aws login abre navegador.
#>
param(
  [string]$ProfileName,
  [ValidateSet('new','advanced')][string]$AwsExperience,
  [string]$Region
)
$ErrorActionPreference = 'Stop'
Write-Host '3 LINE-AR | AWS Agent Toolkit - preparación local para Windows' -ForegroundColor Cyan
if(-not $IsWindows -and $PSVersionTable.PSEdition -eq 'Core'){
  if($env:OS -ne 'Windows_NT'){ throw 'El instalador automatizado está diseñado para Windows.' }
}
if(-not $ProfileName){$ProfileName=Read-Host 'Nombre del perfil AWS CLI que desea utilizar'}
if(-not $AwsExperience){
  $answer=Read-Host '¿Se registró recientemente en AWS con Google/GitHub y creó un proyecto? (S/N)'
  $AwsExperience=if($answer -match '^[sSyY]'){'new'}else{'advanced'}
}
if(-not $Region){
  if($AwsExperience -eq 'new'){
    $Region=Read-Host 'Región donde se creó su proyecto AWS (ej. us-east-1)'
  }else{
    $Region=Read-Host 'Región AWS predeterminada (ej. us-east-1)'
  }
}
if($ProfileName -notmatch '^[A-Za-z0-9_.-]+$'){throw 'Perfil no válido: use letras, números, guion, punto o subrayado.'}
if($Region -notmatch '^[a-z]{2}-[a-z]+-\d+$'){throw 'Región inválida (ejemplo: us-east-1)'}
if(-not (Get-Command powershell -ErrorAction SilentlyContinue) -and -not (Get-Command pwsh -ErrorAction SilentlyContinue)){throw 'PowerShell no disponible.'}
Write-Host 'Comprobando conexión al instalador de AWS…'
try{Invoke-WebRequest -Method Head -Uri 'https://awscli.amazonaws.com' -UseBasicParsing -TimeoutSec 15 | Out-Null}catch{Write-Warning 'No se pudo verificar awscli.amazonaws.com. Revise la conexión.';throw}
if(-not (Get-Command uv -ErrorAction SilentlyContinue)){
  $ok=Read-Host 'No se encontró uv. ¿Instalar desde astral.sh? (S/N)'
  if($ok -notmatch '^[sSyY]'){throw 'uv es obligatorio, instalación cancelada por el usuario.'}
  $installer=Join-Path $env:TEMP 'uv-install.ps1'
  Invoke-WebRequest 'https://astral.sh/uv/install.ps1' -OutFile $installer -UseBasicParsing
  & $installer
  $env:PATH="$env:USERPROFILE\.local\bin;$env:PATH"
}
if(-not (Get-Command aws -ErrorAction SilentlyContinue)){
  $ok=Read-Host 'No se encontró AWS CLI v2. ¿Instalar desde AWS? (S/N)'
  if($ok -notmatch '^[sSyY]'){throw 'AWS CLI obligatorio, cancelado por el usuario.'}
  $installer=Join-Path $env:TEMP 'aws-cli-install.ps1'
  Invoke-WebRequest 'https://awscli.amazonaws.com/v2/install.ps1' -OutFile $installer -UseBasicParsing
  & $installer
  $env:PATH="$env:ProgramFiles\Amazon\AWSCLIV2;$env:PATH"
}
Write-Host 'Verificando AWS CLI y uv…'
aws --version
uv --version
Write-Host "Configurando región $Region para el perfil $ProfileName…"
aws configure set region $Region --profile $ProfileName
Write-Host 'A continuación AWS abre el navegador para el inicio de sesión. No comparta claves.'
aws login --region $Region --profile $ProfileName
if($LASTEXITCODE -ne 0){throw 'aws login no finalizó correctamente'}
aws sts get-caller-identity --profile $ProfileName
if($LASTEXITCODE -ne 0){throw 'Falló la verificación STS. No se instalará el toolkit.'}
Write-Host 'Instalando habilidades y servidores MCP de AWS en agentes detectados…'
aws configure agent-toolkit --yes --region us-east-1 --profile $ProfileName
if($LASTEXITCODE -ne 0){throw 'Falló el asistente de Agent Toolkit.'}
aws agent-toolkit list-available-skills --region us-east-1 --profile $ProfileName
if($LASTEXITCODE -ne 0){throw 'No se pudo listar el catálogo del toolkit.'}
Write-Host ''
Write-Host 'IMPORTANTE: Revise el MCP aws-mcp generado. Agregue en su bloque env:' -ForegroundColor Yellow
Write-Host ('AWS_MCP_PROXY_PROFILES = '+$ProfileName)
Write-Host 'NO reemplace ni borre otros servidores MCP. Para Codex, respetar el formato TOML.'
Write-Host 'Agregue las reglas de AWS apropiadas al AGENTS.md conservando el contenido anterior.'
Write-Host 'Credenciales válidas por 12 horas y renovables durante 90 días sin nuevo acceso web.'
Write-Host 'Cierre y reinicie su agente para cargar las nuevas herramientas.'
