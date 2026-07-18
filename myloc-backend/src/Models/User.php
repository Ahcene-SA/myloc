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
}
