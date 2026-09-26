<?php

declare(strict_types=1);

namespace Myloc\Models;

use Myloc\Config\Database;
use PDO;

class User
{
    private PDO $pdo;

    public function __construct(Database $db)
    {
        $this->pdo = $db->getPdo();
    }

    public function findByEmail(string $email): ?array
    {
        $stmt = $this->pdo->prepare("
            SELECT id, full_name, email, password_hash, phone, role, created_at
            FROM users
            WHERE email = :email
            LIMIT 1
        ");
        $stmt->execute([':email' => $email]);
        $user = $stmt->fetch();
        return $user ?: null;
    }

    public function findById(int $id): ?array
    {
        $stmt = $this->pdo->prepare("
            SELECT id, full_name, email, phone, role, created_at
            FROM users
            WHERE id = :id
            LIMIT 1
        ");
        $stmt->execute([':id' => $id]);
        $user = $stmt->fetch();
        return $user ?: null;
    }

    public function create(string $fullName, string $email, string $phone, string $passwordHash): int
    {
        $stmt = $this->pdo->prepare("
            INSERT INTO users (full_name, email, phone, password_hash, role)
            VALUES (:full_name, :email, :phone, :password_hash, 'client')
        ");
        $stmt->execute([
            ':full_name' => $fullName,
            ':email' => $email,
            ':phone' => $phone,
            ':password_hash' => $passwordHash,
        ]);
        return (int) $this->pdo->lastInsertId();
    }

    public function emailExists(string $email): bool
    {
        $stmt = $this->pdo->prepare("SELECT 1 FROM users WHERE email = :email LIMIT 1");
        $stmt->execute([':email' => $email]);
        return (bool) $stmt->fetch();
    }

    public function findByRole(string $role): array
    {
        $stmt = $this->pdo->prepare("
            SELECT id, full_name, email, phone, role, created_at
            FROM users
            WHERE role = :role
            ORDER BY created_at DESC
        ");
        $stmt->execute([':role' => $role]);
        return $stmt->fetchAll();
    }

    /** Clients avec leur nombre de réservations et le montant confirmé. */
    public function findClientsWithStats(): array
    {
        $stmt = $this->pdo->query("
            SELECT u.id, u.full_name, u.email, u.phone, u.created_at,
                   COUNT(r.id) AS reservations_count,
                   COALESCE(SUM(CASE WHEN r.status = 'confirmed' THEN r.total_price ELSE 0 END), 0) AS confirmed_total,
                   MAX(r.created_at) AS last_reservation_at
            FROM users u
            LEFT JOIN reservations r ON r.user_id = u.id
            WHERE u.role = 'client'
            GROUP BY u.id, u.full_name, u.email, u.phone, u.created_at
            ORDER BY u.created_at DESC
        ");
        return $stmt->fetchAll();
    }

    public function updateProfile(int $id, string $fullName, string $phone): void
    {
        $stmt = $this->pdo->prepare("UPDATE users SET full_name = :full_name, phone = :phone WHERE id = :id");
        $stmt->execute([':full_name' => $fullName, ':phone' => $phone, ':id' => $id]);
    }

    public function getPasswordHash(int $id): ?string
    {
        $stmt = $this->pdo->prepare("SELECT password_hash FROM users WHERE id = :id LIMIT 1");
        $stmt->execute([':id' => $id]);
        $hash = $stmt->fetchColumn();
        return $hash === false ? null : (string) $hash;
    }

    public function updatePassword(int $id, string $passwordHash): void
    {
        $stmt = $this->pdo->prepare("UPDATE users SET password_hash = :hash WHERE id = :id");
        $stmt->execute([':hash' => $passwordHash, ':id' => $id]);
    }
}
