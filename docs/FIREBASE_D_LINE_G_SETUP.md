# 3 LINE-AR: conexión segura de Firebase `d-line-g`

Estado: **PREPARACIÓN**. No se ha verificado acceso administrativo a `d-line-g`, no se ha creado una app web y no se han desplegado reglas de Firestore. La versión pública continúa usando el proyecto antiguo en `auth.js`, `ar-3lilne`. **No confundir los dos proyectos**.

## Ruta A: Firebase en ChatGPT Work / Codex

1. El plugin oficial de Firebase ya aparece instalado y habilitado, pero en el chat normal sus herramientas de MCP pueden no cargarse. Inicia **ChatGPT Work** o **Codex**, crea una sesión nueva y selecciona Firebase. Si no aparece conectado, completa la autorización; no lo reinstales a ciegas.
2. Pide primero una inspección de solo lectura de `d-line-g`: acceso, aplicaciones WEB registradas y configuración, proveedores de Authentication, dominios autorizados, bases de Firestore existentes y edición Standard/Enterprise.
3. **No crees un nuevo proyecto Firebase**. Si ya existe una aplicación WEB de 3 LINE-AR, reutilízala. Solo si no existe, registra una aplicación llamada `3 LINE-AR Web` en `d-line-g`.
4. Solo después de conocer el App ID, consulta el SDK config y actualiza el código en GitHub: `auth.js` debe apuntar a `d-line-g`, no a `ar-3lilne`. Para el hosting web actual, autoriza el dominio `fundacionecopiensaevolution.github.io` (sin `https://` y sin la ruta `/3d-line/`).
5. Activa **Authentication → Sign-in method → Google** y, si se desea, **Anonymous**. El usuario debe confirmar cada cambio de consola y cualquier posible costo. Conserva `browserLocalPersistence` para iniciar sesión automáticamente desde el mismo navegador.
6. Identifica la edición y base de Firestore existentes **antes de decidir reglas, índices o región**. Si aún no existe base, pide aprobación sobre su edición, región y costos posibles antes de crearla.
7. Para guardar datos, usar `/players/{uid}` y reglas de mínimo privilegio: cada jugador solo ve y modifica su perfil cosmético; progreso, monedas, nivel y clasificación deben validarse en backend confiable antes de aceptarlos como recompensas oficiales. No iniciar Firestore en modo de reglas públicas.
8. Comprueba el acceso a GitHub Pages desde un celular y computador. No publiques como «autenticación y backend 100% funcional» hasta que los tests de Google, Firestore y reglas pasen.

## Ruta B: inspección desde PowerShell / Codex local

Se incluye `scripts/diagnose-firebase-d-line-g.ps1` para ejecutar **solamente consultas de lectura**, sin añadir recursos ni modificar ninguna configuración. Ejecutarlo en PowerShell y autorizar la cuenta de Google mediante Firebase CLI cuando haga falta.

Comandos manuales equivalentes:

```powershell
node --version
npx -y firebase-tools@latest --version
npx -y firebase-tools@latest login
npx -y firebase-tools@latest projects:list
npx -y firebase-tools@latest apps:list --project d-line-g
npx -y firebase-tools@latest firestore:databases:list --project d-line-g
```

Una vez verificado que **no** existe app WEB, la creación explícita sería:

```powershell
npx -y firebase-tools@latest apps:create WEB "3 LINE-AR Web" --project d-line-g
```

Y la configuración de la app ya creada, reemplazando un App ID **real**:

```powershell
npx -y firebase-tools@latest apps:sdkconfig WEB "ID_REAL_DE_APP" --project d-line-g
```

**No pegues aquí credenciales administrativas, claves privadas, contraseñas ni tokens de sesión.** La configuración del SDK web de Firebase es pública, pero la seguridad de Firestore depende de Authentication y de sus reglas.

Referencias oficiales:
- https://firebase.google.com/docs/cli
- https://firebase.google.com/docs/ai-assistance/agent-skills
- https://firebase.google.com/docs/auth/web/google-signin
- https://firebase.google.com/docs/firestore/security/get-started
