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
            SELECT *
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
            SELECT id, full_name, email, phone, role, created_at, active, must_change_password, agency,
                   totp_enabled, last_login_at
            FROM users
            WHERE id = :id
            LIMIT 1
        ");
        $stmt->execute([':id' => $id]);
        $user = $stmt->fetch();
        if (!$user) {
            return null;
        }
        $user['role'] = $user['role'] === 'admin' ? 'owner' : $user['role'];
        $user['active'] = (bool) $user['active'];
        $user['must_change_password'] = (bool) $user['must_change_password'];
        $user['totp_enabled'] = (bool) $user['totp_enabled'];
        return $user;
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

    /* ───────────── Équipe de l'agence ───────────── */

    /** Ligne complète (avec secrets) pour les vérifications internes. */
    public function findRawById(int $id): ?array
    {
        $stmt = $this->pdo->prepare("SELECT * FROM users WHERE id = :id LIMIT 1");
        $stmt->execute([':id' => $id]);
        return $stmt->fetch() ?: null;
    }

    public function findStaff(): array
    {
        $stmt = $this->pdo->query("
            SELECT id, full_name, email, phone, role, agency, active, must_change_password, totp_enabled,
                   last_login_at, created_at
            FROM users
            WHERE role IN ('owner', 'employee', 'admin')
            ORDER BY FIELD(role, 'owner', 'admin', 'employee'), full_name
        ");
        return array_map(function (array $u) {
            $u['role'] = $u['role'] === 'admin' ? 'owner' : $u['role'];
            $u['active'] = (bool) $u['active'];
            $u['must_change_password'] = (bool) $u['must_change_password'];
            $u['totp_enabled'] = (bool) $u['totp_enabled'];
            return $u;
        }, $stmt->fetchAll());
    }

    public function createStaff(string $fullName, string $email, string $phone, string $role, ?string $agency, string $passwordHash): int
    {
        $stmt = $this->pdo->prepare("
            INSERT INTO users (full_name, email, password_hash, phone, role, agency, must_change_password)
            VALUES (:full_name, :email, :hash, :phone, :role, :agency, 1)
        ");
        $stmt->execute([
            ':full_name' => $fullName,
            ':email' => $email,
            ':hash' => $passwordHash,
            ':phone' => $phone,
            ':role' => $role,
            ':agency' => $agency,
        ]);
        return (int) $this->pdo->lastInsertId();
    }

    /** @param array<string, mixed> $fields colonnes autorisées : full_name, phone, role, agency, active */
    public function updateStaff(int $id, array $fields): void
    {
        $allowed = ['full_name', 'phone', 'role', 'agency', 'active'];
        $sets = [];
        $params = [':id' => $id];
        foreach ($allowed as $k) {
            if (array_key_exists($k, $fields)) {
                $sets[] = "{$k} = :{$k}";
                $params[":{$k}"] = $fields[$k];
            }
        }
        if ($sets) {
            $this->pdo->prepare('UPDATE users SET ' . implode(', ', $sets) . ' WHERE id = :id')->execute($params);
        }
    }

    public function countActiveOwners(): int
    {
        return (int) $this->pdo->query("SELECT COUNT(*) FROM users WHERE role IN ('owner', 'admin') AND active = 1")->fetchColumn();
    }

    public function setTemporaryPassword(int $id, string $hash): void
    {
        $this->pdo->prepare('UPDATE users SET password_hash = :h, must_change_password = 1, token_version = token_version + 1 WHERE id = :id')
            ->execute([':h' => $hash, ':id' => $id]);
    }

    public function clearMustChangePassword(int $id): void
    {
        $this->pdo->prepare('UPDATE users SET must_change_password = 0 WHERE id = :id')->execute([':id' => $id]);
    }

    /** Invalide toutes les sessions ouvertes de ce compte. */
    public function bumpTokenVersion(int $id): void
    {
        $this->pdo->prepare('UPDATE users SET token_version = token_version + 1 WHERE id = :id')->execute([':id' => $id]);
    }

    public function touchLogin(int $id): void
    {
        $this->pdo->prepare('UPDATE users SET last_login_at = NOW(), last_activity_at = NOW() WHERE id = :id')->execute([':id' => $id]);
    }

    public function setTotpSecret(int $id, ?string $secret): void
    {
        $this->pdo->prepare('UPDATE users SET totp_secret = :s, totp_enabled = 0, recovery_codes = NULL WHERE id = :id')
            ->execute([':s' => $secret, ':id' => $id]);
    }

    /** @param string[] $hashedRecoveryCodes */
    public function enableTotp(int $id, array $hashedRecoveryCodes): void
    {
        $this->pdo->prepare('UPDATE users SET totp_enabled = 1, recovery_codes = :rc WHERE id = :id')
            ->execute([':rc' => json_encode($hashedRecoveryCodes), ':id' => $id]);
    }

    /** @param string[] $hashedRecoveryCodes */
    public function saveRecoveryCodes(int $id, array $hashedRecoveryCodes): void
    {
        $this->pdo->prepare('UPDATE users SET recovery_codes = :rc WHERE id = :id')
            ->execute([':rc' => json_encode(array_values($hashedRecoveryCodes)), ':id' => $id]);
    }

    /**
     * Enregistre la tranche TOTP utilisée. Échoue (false) si une tranche égale ou plus récente
     * a déjà servi : un même code à 6 chiffres ne peut pas être utilisé deux fois.
     */
    public function claimTotpSlice(int $id, int $slice): bool
    {
        $stmt = $this->pdo->prepare('UPDATE users SET totp_last_slice = :s
            WHERE id = :id AND (totp_last_slice IS NULL OR totp_last_slice < :s2)');
        $stmt->execute([':s' => $slice, ':s2' => $slice, ':id' => $id]);
        return $stmt->rowCount() === 1;
    }
}
