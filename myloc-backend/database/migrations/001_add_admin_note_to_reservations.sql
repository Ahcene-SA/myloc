-- Migration: add admin_note column and rejected status to reservations
-- Run this against an existing myloc_db database if the reservations table was created before this change.

ALTER TABLE reservations
    MODIFY COLUMN status ENUM('pending', 'confirmed', 'rejected', 'cancelled') NOT NULL DEFAULT 'pending',
    ADD COLUMN admin_note TEXT NULL AFTER status;
