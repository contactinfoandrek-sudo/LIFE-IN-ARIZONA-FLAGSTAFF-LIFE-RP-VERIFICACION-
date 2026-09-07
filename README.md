# LIFE IN ARIZONA — Sistema de Verificación

Proyecto para Cloudflare Pages + Pages Functions.

## Estructura
- `public/index.html` — formulario y diseño.
- `public/life_arizona_background.png` — fondo.
- `functions/api/submit.js` — recibe el formulario y envía las grabaciones por correo mediante Resend.

## Variables de Cloudflare
Configura estas variables/secretos en el proyecto:
- `RESEND_API_KEY` — API key de Resend.
- `VERIFICATION_EMAIL` — correo donde quieres recibir las solicitudes.
- `RESEND_FROM` — remitente autorizado por Resend (opcional; si se omite usa `Verificaciones <onboarding@resend.dev>` para pruebas).

No pongas estas claves dentro de `index.html`.
