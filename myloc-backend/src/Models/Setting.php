<?php

declare(strict_types=1);

namespace Myloc\Models;

use Myloc\Config\Database;
use PDO;

/** Petits réglages de l'agence stockés en JSON (règles de remise…). */
class Setting
{
    private PDO $pdo;

    public function __construct(Database $db)
    {
        $this->pdo = $db->getPdo();
    }

    public function get(string $name, array $default = []): array
    {
        $stmt = $this->pdo->prepare('SELECT value FROM settings WHERE name = :name LIMIT 1');
        $stmt->execute([':name' => $name]);
        $raw = $stmt->fetchColumn();
        if ($raw === false) {
            return $default;
        }
        $data = json_decode((string) $raw, true);
        return is_array($data) ? $data : $default;
    }

    public function set(string $name, array $value): void
    {
        $stmt = $this->pdo->prepare('INSERT INTO settings (name, value) VALUES (:name, :value)
            ON DUPLICATE KEY UPDATE value = VALUES(value)');
        $stmt->execute([':name' => $name, ':value' => json_encode($value, JSON_UNESCAPED_UNICODE)]);
    }
}
