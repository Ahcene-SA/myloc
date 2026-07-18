<?php

declare(strict_types=1);

namespace Myloc\Models;

use Myloc\Config\Database;
use PDO;

class Reservation
{
    private PDO $pdo;

    public function __construct(Database $db)
    {
        $this->pdo = $db->getPdo();
    }

    public function hasOverlap(int $carId, string $startDate, string $endDate, ?int $excludeId = null): bool
    {
        $sql = "
            SELECT 1 FROM reservations
            WHERE car_id = :car_id
              AND status != 'cancelled'
              AND start_date < :end_date
              AND end_date > :start_date
        ";
        $params = [
            ':car_id' => $carId,
            ':start_date' => $startDate,
            ':end_date' => $endDate,
        ];

        if ($excludeId !== null) {
            $sql .= " AND id != :exclude_id";
            $params[':exclude_id'] = $excludeId;
        }

        $sql .= " LIMIT 1";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        return (bool) $stmt->fetch();
    }

    public function create(int $userId, int $carId, string $startDate, string $endDate, string $fullName, string $email, string $phone, float $totalPrice): int
    {
        $stmt = $this->pdo->prepare("
            INSERT INTO reservations (user_id, car_id, start_date, end_date, full_name, email, phone, status, total_price)
            VALUES (:user_id, :car_id, :start_date, :end_date, :full_name, :email, :phone, 'pending', :total_price)
        ");
        $stmt->execute([
            ':user_id' => $userId,
            ':car_id' => $carId,
            ':start_date' => $startDate,
            ':end_date' => $endDate,
            ':full_name' => $fullName,
            ':email' => $email,
            ':phone' => $phone,
            ':total_price' => $totalPrice,
        ]);
        return (int) $this->pdo->lastInsertId();
    }

    public function findByUserId(int $userId): array
    {
        $stmt = $this->pdo->prepare("
            SELECT r.*, c.name AS car_name, c.category AS car_category
            FROM reservations r
            JOIN cars c ON r.car_id = c.id
            WHERE r.user_id = :user_id
            ORDER BY r.created_at DESC
        ");
        $stmt->execute([':user_id' => $userId]);
        return $stmt->fetchAll();
    }

    public function findAll(): array
    {
        $stmt = $this->pdo->query("
            SELECT r.*, c.name AS car_name, c.category AS car_category, u.full_name AS user_full_name
            FROM reservations r
            JOIN cars c ON r.car_id = c.id
            JOIN users u ON r.user_id = u.id
            ORDER BY r.created_at DESC
        ");
        return $stmt->fetchAll();
    }

    public function findById(int $id): ?array
    {
        $stmt = $this->pdo->prepare("SELECT * FROM reservations WHERE id = :id LIMIT 1");
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public function updateStatus(int $id, string $status, ?string $adminNote = null): bool
    {
        $sql = "UPDATE reservations SET status = :status";
        $params = [':status' => $status, ':id' => $id];

        if ($adminNote !== null) {
            $sql .= ", admin_note = :admin_note";
            $params[':admin_note'] = $adminNote;
        }

        $sql .= " WHERE id = :id";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->rowCount() > 0;
    }
}
