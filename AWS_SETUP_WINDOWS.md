# Instalar Agent Toolkit for AWS en Windows — 3 LINE-AR

Se siguió la guía oficial de AWS: https://github.com/aws/agent-toolkit-for-aws/blob/main/setup-instructions/setup.md

**Estado de esta sesión:** se verificó la guía y se creó un instalador para Windows, pero el entorno de ChatGPT no tiene acceso al PowerShell, navegador de autenticación, perfiles AWS ni directorios MCP del PC del usuario. Por tanto **la instalación en el equipo, la autenticación y la conexión AWS MCP no están completadas**. No se crearon recursos AWS ni costes.

## Datos imprescindibles antes de instalar

El asistente local pregunta:
- Nombre del perfil AWS CLI (puede ser `3d-line`).
- ¿Su cuenta es de experiencia AWS nueva, registrada con Google/GitHub y asociada a un proyecto, o es experiencia avanzada?
- Región predeterminada; si es un proyecto nuevo, **la región del proyecto**.

No se solicitan claves de acceso ni secretos.

## Ejecutar el asistente local (PowerShell)

Descargue/clóne este repositorio en su PC Windows y abra PowerShell en su carpeta raíz:

```powershell
Set-ExecutionPolicy -Scope Process Bypass -Force
.\scripts\setup-aws-agent-toolkit.ps1
```

El script verifica PowerShell, uv, AWS CLI y conexión; solicita permiso antes de instalar dependencias faltantes, abre el navegador con `aws login`, ejecuta `aws sts get-caller-identity`, instala el Agent Toolkit y lista las skills.

Si prefiere hacerlo manualmente después de elegir su perfil y región:

```powershell
aws --version
uv --version
aws configure set region <REGION> --profile <PERFIL>
aws login --region <REGION> --profile <PERFIL>
aws sts get-caller-identity --profile <PERFIL>
aws configure agent-toolkit --yes --region us-east-1 --profile <PERFIL>
aws agent-toolkit list-available-skills --region us-east-1 --profile <PERFIL>
```

**La guía suministrada especifica `us-east-1` para los comandos del toolkit**, aunque la región operativa del proyecto pueda ser otra.

## Ajustes obligatorios de MCP tras el asistente

El instalador AWS puede generar un `aws-mcp` que use el perfil `default`. En **cada** archivo MCP modificado por el asistente, agregue el perfil elegido sin cambiar los demás servidores, comandos, argumentos, transport ni timeouts:

En una configuración JSON que tenga `mcpServers.aws-mcp`:

```json
"env": {
  "AWS_MCP_PROXY_PROFILES": "3d-line"
}
```

Adapte `3d-line` al nombre real de su perfil. **Codex CLI puede usar TOML** (`~/.codex/config.toml`); no pegue JSON allí. Respete el formato original y agregue la variable de entorno en la sección que corresponda al servidor AWS generado. Si ya existía `aws-mcp`, haga una copia de seguridad y revise antes de modificarlo. No toque el orquestador local ni otros conectores ya configurados.

Para cambiar posteriormente de cuenta: `aws login --profile <OTRO_PERFIL>`; agregue ese nombre a la lista separada por espacios de `AWS_MCP_PROXY_PROFILES` y reinicie Codex o el agente.

## Reglas de AWS para Codex

Elegir el archivo correcto tras confirmar el tipo de experiencia:
- AWS nueva: https://raw.githubusercontent.com/aws/agent-toolkit-for-aws/refs/heads/main/rules/aws-starter-rules.md
- AWS avanzada: https://raw.githubusercontent.com/aws/agent-toolkit-for-aws/refs/heads/main/rules/aws-agent-rules.md

Añadir las reglas en `AGENTS.md` del proyecto **sin reemplazar otras reglas existentes**, delimitadas por marcadores `<!-- BEGIN AWS Agent Toolkit rules -->` y `<!-- END AWS Agent Toolkit rules -->`. No instalar las reglas equivocadas si aún no se conoce el tipo de experiencia. Reiniciar Codex después.

Las credenciales con `aws login` duran hasta **12 horas** y se pueden renovar durante **90 días** sin repetir la autenticación web, según las instrucciones de AWS suministradas.

## AWS para el videojuego

No provisionar DynamoDB, Lambda, API Gateway, AppSync, TURN, S3 ni otros recursos automáticamente sin estimar costos y tener aprobación. La beta usa GitHub Pages + señalización pública PeerJS para evitar pagos iniciales. Un servicio estable comercial necesitará migrar el estado y el matchmaking a infraestructura administrada con autenticación, permisos y cuotas.
