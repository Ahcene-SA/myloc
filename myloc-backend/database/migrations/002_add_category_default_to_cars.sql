-- Migration: ensure cars.category has a default value for the simplified admin form.

ALTER TABLE cars
    MODIFY COLUMN category ENUM('citadine', 'suv', 'berline') NOT NULL DEFAULT 'citadine';
