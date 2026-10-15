# Reglas del agente — 3 LINE-AR

## Objetivo
Un videojuego 3D web gratuito en fase beta, PvP por código/QR, con AR nativa cuando sea posible y futura monetización legítima.

## No perder el contexto del usuario
- Valorar el presupuesto: preferir hospedaje y pruebas gratuitos, evitar recursos en la nube de pago sin autorización y estimación de costos.
- No afirmar que existen ingresos publicitarios sin ID real aprobado y anuncios efectivos.
- En modo AR distinguir explícitamente **tablero fijado localmente** de **anclaje espacial verdaderamente compartido** entre dispositivos.
- Mantener la jugabilidad común entre modo AR, 3D, PC y celular.
- Antes de cambiar la lógica PvP, revisar conexiones perdidas, validación de turnos, restricciones de jugadas, sincronización de puntuación y reinicio.

## Versionado estricto
- Cada entrega que cambie el comportamiento de `game.js`, `index.html` o `styles.css` DEBE incrementar la versión mostrada y registrar el cambio en `CHANGELOG.md` y `version.json`.
- Actualizar sincronizadamente versión del HTML, versión de URLs de cache busting y constante VERSION del JS.
- Preferir commits pequeños; no sobrescribir historia ni los archivos originales subidos al chat.
- Verificar GitHub Actions, enlace publicado y comportamiento en dispositivos antes de etiquetar un lanzamiento como estable.

## Pruebas
Ejecutar `node --test tests/static.test.mjs` antes de publicar. Estas pruebas no certifican cámara, AR ni conexión real: completar la lista manual en README.

## AWS
Se requiere conocer el tipo de experiencia AWS, región del proyecto/cuenta y nombre del perfil antes de instalar las reglas oficiales en este AGENTS.md. Conservar el contenido existente. No agregar una segunda sección de reglas AWS: usar marcadores idempotentes. No desplegar recursos ni cargar costos sin consentimiento.
