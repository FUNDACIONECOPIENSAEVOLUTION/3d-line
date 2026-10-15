# 3 LINE-AR — Firebase Hosting gratuito para AdMob (sin dominio propio)

Proyecto Firebase **existente**: `d-line-g`. Juego: https://fundacionecopiensaevolution.github.io/3d-line/

## Qué prepara esta carpeta

`firebase-admob-site/` es un **portal del desarrollador independiente**, no una sustitución del juego. El portal muestra el proyecto 3 LINE-AR y enlaces al juego y soporte. Está pensado para el sitio de referencia de la futura aplicación Android y el archivo de vendedores autorizados de AdMob.

- Dirección **esperada tras el despliegue**, todavía no confirmada en línea: `https://d-line-g.web.app/`.
- Dirección **futura** de vendedores autorizados: `https://d-line-g.web.app/app-ads.txt`.
- El proyecto sigue en el plan Firebase **Spark** si no se modifica desde consola; Hosting tiene cuota gratuita con límites de uso.
- El juego y autenticación en GitHub Pages **no se migran**, se mantienen funcionando como antes.
- **No hay datos de facturación en estos archivos.**

Google admite explícitamente `web.app` y `firebaseapp.com` para alojar `app-ads.txt` sin dominio comprado:
https://support.google.com/admob/answer/9820295?hl=es

## Paso 1. Comprobar Firebase Hosting en la consola

1. Abre: https://console.firebase.google.com/project/d-line-g/hosting/sites
2. Comprueba que sea el proyecto **d-line-g** y que se encuentre en el plan **Spark**.
3. Si ves el botón **Comenzar**, sigue las instrucciones para habilitar Firebase Hosting en el proyecto existente, **sin contratar el plan Blaze**.
4. Si ya se muestra un sitio, comprueba primero si contiene una web: **no se debe sobrescribir** contenido sin revisarlo. El archivo `firebase.json` apunta al sitio por defecto `d-line-g`.

**No hemos verificado desde este chat que Hosting esté habilitado ni que el sitio esté libre**, porque las herramientas Firebase del conector no están disponibles aquí. No hemos desplegado nada al proyecto.

## Paso 2. Descargar el proyecto en Windows

Necesitas Git, Node.js LTS y acceso a GitHub/Firebase:

```powershell
git clone https://github.com/FUNDACIONECOPIENSAEVOLUTION/3d-line.git
cd 3d-line
node --version
npx -y firebase-tools@latest login
```

Si ya tienes descargado `3d-line`, entra en su directorio y ejecuta `git pull` en vez de `git clone`.

Ejecuta el diagnóstico **sin publicar**:

```powershell
.\scripts\firebase-admob-hosting.ps1
```

El script comprobará CLI, inicio de sesión y sitios Hosting visibles en `d-line-g`. Si no puedes iniciar sesión en la consola de Firebase, autoriza el acceso por navegador con `npx -y firebase-tools@latest login`.

## Paso 3. Desplegar solo si verificaste que el sitio no contiene algo que haya que conservar

Desde la raíz de la copia GitHub:

```powershell
.\scripts\firebase-admob-hosting.ps1 -Deploy
```

El script **no modifica Firestore ni Firebase Authentication**; usa `firebase deploy --only hosting` dentro de `firebase-admob-site`. Antes de publicar pide escribir literalmente `PUBLICAR d-line-g`. **Desplegar reemplaza el contenido de la versión previa de Hosting del mismo sitio**. Si ya tienes otro portal alojado allí, detén este paso.

Después del despliegue, comprueba en una ventana privada:
- `https://d-line-g.web.app/` — debe mostrar el portal 3 LINE-AR.
- `https://d-line-g.firebaseapp.com/` — puede servir el mismo portal.

El programa HTML5 seguirá en https://fundacionecopiensaevolution.github.io/3d-line/ .

## Paso 4. Crear AdMob y publicar app-ads.txt con tu ID real

1. Regístrate en https://admob.google.com/ y completa los pasos de verificación bajo tu propia cuenta.
2. Consulta el **ID de editor** real en AdMob → Configuración; tiene forma `pub-1234567890123456` o `ca-pub-1234567890123456` (16 cifras). **No confundas este ID con el ID de aplicación `ca-app-pub-...` ni con el ID de unidad publicitaria.**
3. Desde la raíz del repositorio, genera localmente `public/app-ads.txt` con:
   ```powershell
   .\scripts\firebase-admob-hosting.ps1 -PublisherId "pub-1234567890123456"
   ```
   El ejemplo numérico es **solo una demostración**. Sustituye por tu ID auténtico. El archivo resultante usará la línea
   ```
   google.com, pub-TU_ID_REAL, DIRECT, f08c47fec0942fa0
   ```
   No existe un `public/app-ads.txt` preconfigurado; se crea solo después de recibir el ID verdadero.
4. Revisa la línea y vuelve a ejecutar el despliegue con `-Deploy`.
5. Comprueba que en `https://d-line-g.web.app/app-ads.txt` aparezca **solo** tu línea real y que responda sin pedir iniciar sesión. No se debe copiar el nombre del archivo de plantilla a la carpeta pública.

Documentación oficial:
https://developers.google.com/ad-manager/mobile-ads-sdk/android/next-gen/app-ads
https://support.google.com/admob/answer/9363762?hl=es

## Paso 5. Google Play y verificación de AdMob

Cuando la aplicación Android esté lista y exista su ficha en Play Console:

1. En la información de contacto de la ficha de aplicación, establece el **sitio web del desarrollador** como `https://d-line-g.web.app/`. No pongas el URL de GitHub Pages ni la ruta `/app-ads.txt` en ese campo.
2. La aplicación necesita aparecer publicada en una tienda compatible para que AdMob pueda descubrir y verificar el archivo siguiendo la información pública de la ficha.
3. Revisa AdMob → app-ads.txt para validar el estado. Google puede tardar 24 horas o más en descubrir los cambios; la aceptación y activación de anuncios no están garantizadas.
4. Para monetización dentro de la APK/AAB sigue haciendo falta **integrar el SDK de Google Mobile Ads/AdMob y unidades de anuncio Android**, revisar política de privacidad, consentimiento, datos de seguridad y prueba de recompensas.

La publicación de este portal **no crea la APK, AAB, cuenta AdMob ni ingresos automáticamente**. Los ID publicitarios web y Android son diferentes.

## Rutas exactas

| Elemento | Ruta GitHub |
| --- | --- |
| Configuración Firebase Hosting | `firebase-admob-site/firebase.json` |
| Proyecto Firebase elegido | `firebase-admob-site/.firebaserc` |
| Portal del desarrollador | `firebase-admob-site/public/index.html` |
| Plantilla NO publicada para app-ads | `firebase-admob-site/app-ads.template.txt` |
| app-ads real, tras recibir publisher ID | `firebase-admob-site/public/app-ads.txt` |
| Script de diagnóstico/despliegue | `scripts/firebase-admob-hosting.ps1` |
| Juego que sigue en GitHub Pages | `index.html`, `game.js`, `auth.js` |

**Seguridad:** no compartas contraseñas, tokens de acceso, credenciales de cuentas de servicio ni claves de firma Android. Un Publisher ID de AdMob no es secreto, pero solo sirve para verificación publicitaria tras la aprobación.
