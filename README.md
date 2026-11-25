# SNOW·PROFE — Aprende snowboard

Web para aprender snowboard paso a paso, con una tabla 3D (Three.js) que se mueve con el scroll.
Se puede instalar en la pantalla de inicio del móvil como app (pantalla completa, solo vertical, sin zoom).

## Cómo funciona
Cada paso ocupa una pantalla. En la tabla 3D aparecen **puntos rojos**: al tocarlos la escena reacciona
(la tabla se da la vuelta, la fijación se levanta, el rider flexiona…) y se abre la explicación.

Tablas: la blanca del oso (Drake, fijaciones negras) y la negra de la serpiente (fijaciones naranjas).

## Pasos de la clase
0. Inicio · 1. Tu tabla · 2. Fijaciones · 3. ¿Regular o goofy? (test) · 4. Postura base
5. **Método de los pedales** · 6. Front y back · 7. Hoja muerta · 8. Tu primer giro · 9. Trucos
10. **La bajada**: pista roja de 900 m estilo Formigal (bajada libre o slalom) · 11. Consejos · 12. Instalar

## Probar en local
```bash
python3 -m http.server 8080
```
y abrir http://localhost:8080

## Dónde editar
- Textos de cada paso: `index.html`
- Trucos y consejos: `js/content.js`
- Escena 3D (tabla, fijaciones, rider, pista): `js/world.js`
- Cámara por paso, puntos interactivos, pedales, giros: `js/main.js`
- Montaña y física de la bajada: `js/game.js`
- Estilos: `styles.css`

Es una web estática: se puede publicar tal cual en GitHub Pages, Vercel o Netlify (necesita HTTPS para instalarse como app).

## Recursos
- Texturas de las tablas: sacadas de tus fotos (`tools/textures/` regenera).
- Fondos, nieve y tejido: [Poly Haven](https://polyhaven.com) (CC0) — `horn-koppe_snow`, `stierberg_sunrise`, `snow_02`, `bi_stretch`.
- Scroll suave: [Lenis](https://github.com/darkroomengineering/lenis) (MIT).

## Rendimiento
- Arranque ligero (tablas + fondo de estudio, ~0,5 MB); cielo, nieve y tejidos se cargan después.
- Calidad adaptativa: baja la resolución si el móvil no llega a ~45 fps y la sube si sobra.
- En móvil: sombras más ligeras, menos copos y pinos, sin desenfoques caros.
