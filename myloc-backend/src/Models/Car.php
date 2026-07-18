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
            INSERT INTO cars (category, name, description, price_per_day, transmission, seats, year, image_url, status)
            VALUES (:category, :name, :description, :price_per_day, :transmission, :seats, :year, :image_url, :status)
        ");
        $stmt->execute([
            ':category' => $data['category'] ?? 'citadine',
            ':name' => $data['name'],
            ':description' => $data['description'],
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

        $allowed = ['category', 'name', 'description', 'price_per_day', 'transmission', 'seats', 'year', 'image_url', 'status'];
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

    public function setUnavailable(int $id): bool
    {
        $stmt = $this->pdo->prepare("UPDATE cars SET status = 'unavailable' WHERE id = :id");
        $stmt->execute([':id' => $id]);
        return $stmt->rowCount() > 0;
    }
}
