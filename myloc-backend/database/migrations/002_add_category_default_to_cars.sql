-- Migration 002 : REMPLACÉE par 003_add_compacte_category.sql — ne fait plus rien.
--
-- Cette migration redéfinissait cars.category en ENUM('citadine', 'suv', 'berline') :
-- rejouée aujourd'hui, elle supprimerait la catégorie « compacte » (et ferait échouer
-- ou vider la catégorie des véhicules compacts). La valeur par défaut 'citadine' est
-- déjà posée par 003 et par database/migrate.php (étape 1).
--
-- Pour mettre une base à jour, utilisez : php database/migrate.php

SELECT 'Migration 002 remplacée par 003 : rien à faire.' AS info;
