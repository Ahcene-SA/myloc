-- Migration: point the demo fleet to the new trimmed images (public/images/cars/*.png),
-- fix the "Mokka" spelling and move the Astra to the "compacte" category.
-- Requires 003_add_compacte_category.sql. Safe to run several times.

UPDATE cars SET image_url = 'images/cars/clio5-alpino.png'    WHERE image_url = 'images/clio5-alpino.png';
UPDATE cars SET image_url = 'images/cars/clio5-techno.png'    WHERE image_url = 'images/clio5-techno.png';
UPDATE cars SET image_url = 'images/cars/citroen-c3.png'      WHERE image_url = 'images/citroen-c3.png';
UPDATE cars SET image_url = 'images/cars/opel-astra.png', category = 'compacte' WHERE image_url = 'images/opel-astra.png';
UPDATE cars SET image_url = 'images/cars/opel-mokka.png', name = 'Opel Mokka'   WHERE image_url = 'images/opel-mocca.png';
UPDATE cars SET image_url = 'images/cars/renault-captur.png'  WHERE image_url = 'images/renault-captur.png';
UPDATE cars SET image_url = 'images/cars/jetour-x70-plus.png' WHERE image_url = 'images/jetour-x70+.png';
