<?php

declare(strict_types=1);

namespace Myloc\Utils;

use Myloc\Config\Database;

class RateLimiter
{
    private Database $db;
    private int $maxAttempts;
    private int $windowSeconds;

    public function __construct(Database $db)
    {
        $this->db = $db;
        $this->maxAttempts = (int) ($_ENV['RATE_LIMIT_MAX_ATTEMPTS'] ?? 5);
        $this->windowSeconds = (int) ($_ENV['RATE_LIMIT_WINDOW_SECONDS'] ?? 900);
    }

    public function isAllowed(string $identifier): bool
    {
        $pdo = $this->db->getPdo();

        $stmt = $pdo->prepare("
            SELECT attempts, last_attempt
            FROM login_attempts
            WHERE identifier = :identifier
        ");
        $stmt->execute([':identifier' => $identifier]);
        $row = $stmt->fetch();

        if (!$row) {
            return true;
        }

        $lastAttempt = strtotime($row['last_attempt']);
        $attempts = (int) $row['attempts'];

        if ($attempts >= $this->maxAttempts && (time() - $lastAttempt) < $this->windowSeconds) {
            return false;
        }

        if ((time() - $lastAttempt) >= $this->windowSeconds) {
            return true;
        }

        return $attempts < $this->maxAttempts;
    }

    public function recordFailure(string $identifier): void
    {
        $pdo = $this->db->getPdo();

        $stmt = $pdo->prepare("
            INSERT INTO login_attempts (identifier, attempts, last_attempt)
            VALUES (:identifier, 1, NOW())
            ON DUPLICATE KEY UPDATE
                attempts = IF(TIMESTAMPDIFF(SECOND, last_attempt, NOW()) >= :window, 1, attempts + 1),
                last_attempt = NOW()
        ");
        $stmt->execute([
            ':identifier' => $identifier,
            ':window' => $this->windowSeconds,
        ]);
    }

    public function reset(string $identifier): void
    {
        $pdo = $this->db->getPdo();

        $stmt = $pdo->prepare("DELETE FROM login_attempts WHERE identifier = :identifier");
        $stmt->execute([':identifier' => $identifier]);
    }
}
