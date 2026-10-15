# 3 LINE-AR: conexión segura de Firebase `d-line-g`

Estado **ACTUALIZADO — 15/10/2026**: el usuario aportó la configuración SDK de una aplicación WEB de `d-line-g` y captura con el dominio `fundacionecopiensaevolution.github.io` en Authentication → Dominios autorizados. `auth.js` de la V57.2.0 ya apunta a `d-line-g`. **Aún no se verificó** acceso administrativo por MCP, habilitación del proveedor Google, Firestore, reglas o inicio de sesión en dispositivo.

## Ruta A: Firebase en ChatGPT Work / Codex

1. El plugin oficial de Firebase ya aparece instalado y habilitado, pero en el chat normal sus herramientas de MCP pueden no cargarse. Inicia **ChatGPT Work** o **Codex**, crea una sesión nueva y selecciona Firebase. Si no aparece conectado, completa la autorización; no lo reinstales a ciegas.
2. Pide primero una inspección de solo lectura de `d-line-g`: acceso, aplicaciones WEB registradas y configuración, proveedores de Authentication, dominios autorizados, bases de Firestore existentes y edición Standard/Enterprise.
3. **No crees un nuevo proyecto Firebase**. Ya existe una aplicación WEB de `d-line-g` y su App ID está en `auth.js`; **no registres otra** sin necesidad. Consultar la consola para verificar su nombre y configuración.
4. El App ID y SDK config ya se conocen por captura y `auth.js` ya apunta a `d-line-g`. Verificar en Firebase Console que corresponden a la app deseada; no reintroducir `ar-3lilne`. El dominio de GitHub Pages ya figura autorizado según captura del usuario.
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

**No ejecutes este comando para el juego actual, porque ya existe una aplicación WEB.** Solo como referencia, si algún día se necesita una nueva app:

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
