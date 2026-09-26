<?php

declare(strict_types=1);

namespace Myloc\Models;

use Myloc\Config\Database;
use PDO;

class Inspection
{
    private PDO $pdo;

    public function __construct(Database $db)
    {
        $this->pdo = $db->getPdo();
    }

    /** @return array<string, array> indexé par type ('depart', 'retour') */
    public function forReservation(int $reservationId): array
    {
        $stmt = $this->pdo->prepare('SELECT * FROM inspections WHERE reservation_id = :id');
        $stmt->execute([':id' => $reservationId]);
        $out = [];
        foreach ($stmt->fetchAll() as $row) {
            $out[$row['type']] = $this->decode($row);
        }
        return $out;
    }

    public function upsert(int $reservationId, string $type, array $d, int $userId): void
    {
        $stmt = $this->pdo->prepare('INSERT INTO inspections
                (reservation_id, type, mileage, fuel_level, damages, photos, notes, created_by)
            VALUES (:rid, :type, :mileage, :fuel, :damages, :photos, :notes, :by)
            ON DUPLICATE KEY UPDATE mileage = VALUES(mileage), fuel_level = VALUES(fuel_level),
                damages = VALUES(damages), photos = VALUES(photos), notes = VALUES(notes)');
        $stmt->execute([
            ':rid' => $reservationId,
            ':type' => $type,
            ':mileage' => $d['mileage'],
            ':fuel' => $d['fuel_level'],
            ':damages' => json_encode($d['damages'], JSON_UNESCAPED_UNICODE),
            ':photos' => json_encode($d['photos'], JSON_UNESCAPED_SLASHES),
            ':notes' => $d['notes'],
            ':by' => $userId,
        ]);
    }

    private function decode(array $row): array
    {
        $row['damages'] = json_decode((string) $row['damages'], true) ?: [];
        $row['photos'] = json_decode((string) $row['photos'], true) ?: [];
        $row['mileage'] = $row['mileage'] !== null ? (int) $row['mileage'] : null;
        $row['fuel_level'] = $row['fuel_level'] !== null ? (int) $row['fuel_level'] : null;
        return $row;
    }
}
