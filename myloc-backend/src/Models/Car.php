<?php

declare(strict_types=1);

namespace Myloc\Models;

use Myloc\Config\Database;
use PDO;

class Car
{
    private PDO $pdo;

    public function __construct(Database $db)
    {
        $this->pdo = $db->getPdo();
    }

    public function findAllAvailable(?string $category = null): array
    {
        $sql = "SELECT * FROM cars WHERE status = 'available'";
        $params = [];

        if ($category !== null && $category !== '') {
            $sql .= " AND category = :category";
            $params[':category'] = $category;
        }

        $sql .= " ORDER BY created_at DESC";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    public function findById(int $id, bool $allowUnavailable = false): ?array
    {
        $sql = "SELECT * FROM cars WHERE id = :id";
        if (!$allowUnavailable) {
            $sql .= " AND status = 'available'";
        }
        $sql .= " LIMIT 1";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([':id' => $id]);
        $car = $stmt->fetch();
        return $car ?: null;
    }

    public function create(array $data): int
    {
        $stmt = $this->pdo->prepare("
            INSERT INTO cars (category, name, plate, description, price_per_day, transmission, seats, year, image_url, status)
            VALUES (:category, :name, :plate, :description, :price_per_day, :transmission, :seats, :year, :image_url, :status)
        ");
        $stmt->execute([
            ':category' => $data['category'] ?? 'citadine',
            ':name' => $data['name'],
            ':plate' => $data['plate'] ?? null,
            ':description' => $data['description'] ?? null,
            ':price_per_day' => $data['price_per_day'],
            ':transmission' => $data['transmission'],
            ':seats' => $data['seats'],
            ':year' => $data['year'],
            ':image_url' => $data['image_url'] ?? null,
            ':status' => $data['status'] ?? 'available',
        ]);
        return (int) $this->pdo->lastInsertId();
    }

    public function update(int $id, array $data): bool
    {
        $fields = [];
        $params = [':id' => $id];

        $allowed = ['category', 'name', 'plate', 'description', 'price_per_day', 'transmission', 'seats', 'year', 'image_url', 'status'];
        foreach ($allowed as $key) {
            if (array_key_exists($key, $data)) {
                $fields[] = "{$key} = :{$key}";
                $params[":{$key}"] = $data[$key];
            }
        }

        if (empty($fields)) {
            return false;
        }

        $sql = "UPDATE cars SET " . implode(', ', $fields) . " WHERE id = :id";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->rowCount() > 0;
    }

    /** Véhicules en ligne et libres sur la période [start, end[ (le jour du retour reste libre). */
    public function findFreeBetween(string $start, string $end, ?string $category = null): array
    {
        $sql = "
            SELECT c.* FROM cars c
            WHERE c.status = 'available'
              AND NOT EXISTS (
                  SELECT 1 FROM reservations r
                  WHERE r.car_id = c.id
                    AND r.status IN ('pending', 'confirmed')
                    AND r.start_date < :end_date
                    AND r.end_date > :start_date
              )
        ";
        $params = [':start_date' => $start, ':end_date' => $end];
        if ($category !== null && $category !== '') {
            $sql .= " AND c.category = :category";
            $params[':category'] = $category;
        }
        $sql .= " ORDER BY c.price_per_day ASC";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    /** Toute la flotte (y compris retirée du site), pour l'administration. */
    public function findAll(): array
    {
        $stmt = $this->pdo->query("
            SELECT c.*,
                   (SELECT COUNT(*) FROM reservations r WHERE r.car_id = c.id) AS reservations_count
            FROM cars c
            ORDER BY c.status = 'available' DESC, c.created_at DESC
        ");
        return $stmt->fetchAll();
    }

    public function countReservations(int $id): int
    {
        $stmt = $this->pdo->prepare("SELECT COUNT(*) FROM reservations WHERE car_id = :id");
        $stmt->execute([':id' => $id]);
        return (int) $stmt->fetchColumn();
    }

    public function hardDelete(int $id): bool
    {
        $stmt = $this->pdo->prepare("DELETE FROM cars WHERE id = :id");
        $stmt->execute([':id' => $id]);
        return $stmt->rowCount() > 0;
    }

    public function setUnavailable(int $id): bool
    {
        $stmt = $this->pdo->prepare("UPDATE cars SET status = 'unavailable' WHERE id = :id");
        $stmt->execute([':id' => $id]);
        return $stmt->rowCount() > 0;
    }
}
