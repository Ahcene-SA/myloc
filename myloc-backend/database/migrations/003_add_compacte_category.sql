-- Migration: add the "compacte" category (used on the MYLOC.DZ Instagram).
-- Run against an existing myloc_db database created before this change.

ALTER TABLE cars
    MODIFY COLUMN category ENUM('citadine', 'compacte', 'suv', 'berline') NOT NULL DEFAULT 'citadine';
