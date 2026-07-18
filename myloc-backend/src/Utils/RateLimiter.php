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
            SELECT attempts, UNIX_TIMESTAMP(last_attempt) AS last_attempt_unix
            FROM login_attempts
            WHERE identifier = :identifier
        ");
        $stmt->execute([':identifier' => $identifier]);
        $row = $stmt->fetch();

        if (!$row) {
            return true;
        }

        $lastAttempt = (int) $row['last_attempt_unix'];
        $attempts = (int) $row['attempts'];

        if ($attempts >= $this->maxAttempts && (time() - $lastAttempt) < $this->windowSeconds) {
            return false;
        }

        if ((time() - $lastAttempt) >= $this->windowSeconds) {
            return true;
        }

        return $attempts < $this->maxAttempts;
    }

    public function remainingLockoutSeconds(string $identifier): int
    {
        $pdo = $this->db->getPdo();

        $stmt = $pdo->prepare("
            SELECT attempts, UNIX_TIMESTAMP(last_attempt) AS last_attempt_unix
            FROM login_attempts
            WHERE identifier = :identifier
        ");
        $stmt->execute([':identifier' => $identifier]);
        $row = $stmt->fetch();

        if (!$row) {
            return 0;
        }

        $lastAttempt = (int) $row['last_attempt_unix'];
        $attempts = (int) $row['attempts'];

        if ($attempts >= $this->maxAttempts) {
            $elapsed = time() - $lastAttempt;
            $remaining = $this->windowSeconds - $elapsed;
            return max(0, $remaining);
        }

        return 0;
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

    public function getDatabasePdo(): \PDO
    {
        return $this->db->getPdo();
    }
}
