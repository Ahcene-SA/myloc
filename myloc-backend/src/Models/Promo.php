<?php

declare(strict_types=1);

namespace Myloc\Models;

use Myloc\Config\Database;
use PDO;

class Promo
{
    private PDO $pdo;

    public function __construct(Database $db)
    {
        $this->pdo = $db->getPdo();
    }

    public function findAll(): array
    {
        return $this->pdo->query('SELECT * FROM promo_codes ORDER BY active DESC, created_at DESC')->fetchAll();
    }

    public function findById(int $id): ?array
    {
        $stmt = $this->pdo->prepare('SELECT * FROM promo_codes WHERE id = :id LIMIT 1');
        $stmt->execute([':id' => $id]);
        return $stmt->fetch() ?: null;
    }

    public function findByCode(string $code): ?array
    {
        $stmt = $this->pdo->prepare('SELECT * FROM promo_codes WHERE code = :code LIMIT 1');
        $stmt->execute([':code' => strtoupper(trim($code))]);
        return $stmt->fetch() ?: null;
    }

    public function create(array $d): int
    {
        $stmt = $this->pdo->prepare('INSERT INTO promo_codes
            (code, description, discount_type, discount_value, min_days, valid_from, valid_until, max_uses, active)
            VALUES (:code, :description, :discount_type, :discount_value, :min_days, :valid_from, :valid_until, :max_uses, :active)');
        $stmt->execute($this->params($d));
        return (int) $this->pdo->lastInsertId();
    }

    public function update(int $id, array $d): void
    {
        $stmt = $this->pdo->prepare('UPDATE promo_codes SET code = :code, description = :description,
            discount_type = :discount_type, discount_value = :discount_value, min_days = :min_days,
            valid_from = :valid_from, valid_until = :valid_until, max_uses = :max_uses, active = :active
            WHERE id = :id');
        $stmt->execute($this->params($d) + [':id' => $id]);
    }

    public function delete(int $id): void
    {
        $stmt = $this->pdo->prepare('DELETE FROM promo_codes WHERE id = :id');
        $stmt->execute([':id' => $id]);
    }

    public function incrementUses(string $code): void
    {
        $stmt = $this->pdo->prepare('UPDATE promo_codes SET uses = uses + 1 WHERE code = :code');
        $stmt->execute([':code' => $code]);
    }

    private function params(array $d): array
    {
        return [
            ':code' => $d['code'],
            ':description' => $d['description'] ?? null,
            ':discount_type' => $d['discount_type'],
            ':discount_value' => $d['discount_value'],
            ':min_days' => $d['min_days'] ?? null,
            ':valid_from' => $d['valid_from'] ?? null,
            ':valid_until' => $d['valid_until'] ?? null,
            ':max_uses' => $d['max_uses'] ?? null,
            ':active' => !empty($d['active']) ? 1 : 0,
        ];
    }
}
