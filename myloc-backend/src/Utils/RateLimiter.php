<?php

declare(strict_types=1);

namespace Myloc\Utils;

use Myloc\Config\Database;

class RateLimiter
{
    private Database $db;
    private int $maxAttempts;
    private int $windowSeconds;

    /**
     * @param int|null $maxAttempts   par défaut RATE_LIMIT_MAX_ATTEMPTS (.env)
     * @param int|null $windowSeconds par défaut RATE_LIMIT_WINDOW_SECONDS (.env)
     *        Ex. limite par adresse IP : new RateLimiter($db, 20, 900)
     */
    public function __construct(Database $db, ?int $maxAttempts = null, ?int $windowSeconds = null)
    {
        $this->db = $db;
        $this->maxAttempts = $maxAttempts ?? (int) ($_ENV['RATE_LIMIT_MAX_ATTEMPTS'] ?? 5);
        $this->windowSeconds = $windowSeconds ?? (int) ($_ENV['RATE_LIMIT_WINDOW_SECONDS'] ?? 900);
    }

    public function maxAttempts(): int
    {
        return $this->maxAttempts;
    }

    /** Essais restants avant blocage (fenêtre en cours). */
    public function remainingAttempts(string $identifier): int
    {
        $stmt = $this->db->getPdo()->prepare('SELECT attempts, UNIX_TIMESTAMP(last_attempt) AS t FROM login_attempts WHERE identifier = :identifier');
        $stmt->execute([':identifier' => $identifier]);
        $row = $stmt->fetch();
        if (!$row || time() - (int) $row['t'] >= $this->windowSeconds) {
            return $this->maxAttempts;
        }
        return max(0, $this->maxAttempts - (int) $row['attempts']);
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
