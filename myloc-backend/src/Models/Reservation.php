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
              AND status IN ('pending', 'confirmed')
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

    /**
     * @param array<string, mixed> $details pickup_place, pickup_time, return_place, return_time,
     *                                      delivery_address, license_number, payment_method, client_note
     * @param array{status?: string, source?: string, admin_note?: ?string, pricing?: array} $options
     */
    public function create(?int $userId, int $carId, string $startDate, string $endDate, string $fullName, ?string $email, string $phone, float $totalPrice, array $details = [], array $options = []): int
    {
        $stmt = $this->pdo->prepare("
            INSERT INTO reservations (user_id, car_id, start_date, end_date, full_name, email, phone, status, source, admin_note, total_price, base_price, discount_amount, discount_label, promo_code,
                pickup_place, pickup_time, return_place, return_time, delivery_address, license_number, payment_method, client_note)
            VALUES (:user_id, :car_id, :start_date, :end_date, :full_name, :email, :phone, :status, :source, :admin_note, :total_price, :base_price, :discount_amount, :discount_label, :promo_code,
                :pickup_place, :pickup_time, :return_place, :return_time, :delivery_address, :license_number, :payment_method, :client_note)
        ");
        $stmt->execute([
            ':user_id' => $userId,
            ':car_id' => $carId,
            ':start_date' => $startDate,
            ':end_date' => $endDate,
            ':full_name' => $fullName,
            ':email' => $email,
            ':phone' => $phone,
            ':status' => $options['status'] ?? 'pending',
            ':source' => $options['source'] ?? 'site',
            ':admin_note' => $options['admin_note'] ?? null,
            ':total_price' => $totalPrice,
            ':base_price' => $options['pricing']['base_price'] ?? $totalPrice,
            ':discount_amount' => $options['pricing']['discount_amount'] ?? 0,
            ':discount_label' => $options['pricing']['discount_label'] ?? null,
            ':promo_code' => $options['pricing']['promo_code'] ?? null,
            ':pickup_place' => $details['pickup_place'] ?? null,
            ':pickup_time' => $details['pickup_time'] ?? null,
            ':return_place' => $details['return_place'] ?? null,
            ':return_time' => $details['return_time'] ?? null,
            ':delivery_address' => $details['delivery_address'] ?? null,
            ':license_number' => $details['license_number'] ?? null,
            ':payment_method' => $details['payment_method'] ?? null,
            ':client_note' => $details['client_note'] ?? null,
        ]);
        return (int) $this->pdo->lastInsertId();
    }

    /** Périodes déjà prises pour une voiture (sans données personnelles). */
    public function bookedRanges(int $carId): array
    {
        $stmt = $this->pdo->prepare("
            SELECT start_date, end_date
            FROM reservations
            WHERE car_id = :car_id
              AND status IN ('pending', 'confirmed')
              AND end_date >= CURDATE()
            ORDER BY start_date
        ");
        $stmt->execute([':car_id' => $carId]);
        return $stmt->fetchAll();
    }

    public function findByUserId(int $userId): array
    {
        $stmt = $this->pdo->prepare("
            SELECT r.*, c.name AS car_name, c.category AS car_category, c.image_url AS car_image_url,
                   c.price_per_day AS car_price_per_day, c.transmission AS car_transmission, c.seats AS car_seats
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
            SELECT r.*, c.name AS car_name, c.category AS car_category, c.image_url AS car_image_url,
                   c.price_per_day AS car_price_per_day, c.transmission AS car_transmission, c.seats AS car_seats,
                   c.plate AS car_plate, c.year AS car_year, u.full_name AS user_full_name, u.email AS user_email
            FROM reservations r
            JOIN cars c ON r.car_id = c.id
            LEFT JOIN users u ON r.user_id = u.id
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

    /** Une réservation avec les infos voiture/compte, comme dans findAll(). */
    public function findDetailedById(int $id): ?array
    {
        $stmt = $this->pdo->prepare("
            SELECT r.*, c.name AS car_name, c.category AS car_category, c.image_url AS car_image_url,
                   c.price_per_day AS car_price_per_day, c.transmission AS car_transmission, c.seats AS car_seats,
                   c.plate AS car_plate, c.year AS car_year, u.full_name AS user_full_name, u.email AS user_email
            FROM reservations r
            JOIN cars c ON r.car_id = c.id
            LEFT JOIN users u ON r.user_id = u.id
            WHERE r.id = :id LIMIT 1
        ");
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
