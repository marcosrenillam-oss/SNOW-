# SNOW·PROFE — Aprende snowboard

Web para aprender snowboard paso a paso, con una tabla 3D (Three.js) que se mueve con el scroll.
Se puede instalar en la pantalla de inicio del móvil como app (pantalla completa, solo vertical, sin zoom).

## Pasos de la clase
0. Inicio · 1. Tu tabla · 2. Fijaciones (ángulos interactivos) · 3. ¿Regular o goofy? (test)
4. Postura base · 5. **Método de los pedales** (interactivo) · 6. Front y back · 7. Hoja muerta
8. Tu primer giro · 9. Trucos (ollie, nollie, press, shifty, 180) · 10. Reto: slalom de pedales
11. Consejos del profe · 12. Instalar la app

## Probar en local
```bash
python3 -m http.server 8080
```
y abrir http://localhost:8080

## Dónde editar
- Textos de cada paso: `index.html`
- Trucos y consejos: `js/content.js`
- Escena 3D (tabla, fijaciones, rider, pista): `js/world.js`
- Cámara por paso, pedales, giros, juego: `js/main.js`
- Estilos: `styles.css`

Es una web estática: se puede publicar tal cual en GitHub Pages, Vercel o Netlify (necesita HTTPS para instalarse como app).
