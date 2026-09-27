<?php

declare(strict_types=1);

namespace Myloc\Middleware;

use Myloc\Config\Database;
use Myloc\Utils\JwtHelper;
use Myloc\Utils\Response;

/**
 * Contrôle d'accès.
 * - Clients : jeton de 24 h.
 * - Équipe (propriétaire / employé) : jeton « agence » de 10 h maximum, coupé après
 *   30 min d'inactivité, invalidé si le compte est désactivé ou si « déconnecter tous
 *   mes appareils » a été utilisé (token_version).
 */
class AuthMiddleware
{
    public const STAFF_ROLES = ['owner', 'employee', 'admin'];
    public const IDLE_SECONDS = 1800;
    public const AGENCY_SESSION_SECONDS = 36000;

    /** Utilisateur de la requête en cours (pour le journal d'activité). */
    private static ?array $current = null;

    public static function isStaffRole(?string $role): bool
    {
        return in_array($role, self::STAFF_ROLES, true);
    }

    /** « admin » (anciens comptes) = propriétaire. */
    public static function normalizeRole(string $role): string
    {
        return $role === 'admin' ? 'owner' : $role;
    }

    public static function current(): ?array
    {
        return self::$current;
    }

    /**
     * @param bool $allowPasswordChange autorise un membre de l'équipe qui doit encore
     *        changer son mot de passe provisoire (seulement pour « me » et le changement de mot de passe)
     */
    public static function requireAuth(bool $allowPasswordChange = false): array
    {
        $header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
        if ($header === '' || !str_starts_with($header, 'Bearer ')) {
            Response::error('Veuillez vous connecter.', 401);
        }

        $token = substr($header, 7);
        if ($token === '') {
            Response::error('Veuillez vous connecter.', 401);
        }

        try {
            $decoded = JwtHelper::decode($token);
        } catch (\RuntimeException $e) {
            Response::error('Session expirée : reconnectez-vous.', 401);
        }

        if (!isset($decoded->sub, $decoded->role) || (($decoded->scope ?? '') === 'mfa')) {
            Response::error('Session invalide : reconnectez-vous.', 401);
        }

        $user = [
            'user_id' => (int) $decoded->sub,
            'role' => self::normalizeRole((string) $decoded->role),
            'name' => null,
        ];

        if (self::isStaffRole((string) $decoded->role)) {
            $user = self::checkStaffSession($user, $decoded, $allowPasswordChange);
        }

        self::$current = $user;
        return $user;
    }

    private static function checkStaffSession(array $user, object $decoded, bool $allowPasswordChange): array
    {
        if (($decoded->scope ?? '') !== 'agency') {
            Response::error('Connectez-vous depuis l\'espace agence.', 401);
        }

        $pdo = Database::shared()->getPdo();
        $stmt = $pdo->prepare('SELECT full_name, role, active, token_version, must_change_password,
                UNIX_TIMESTAMP(last_activity_at) AS last_activity FROM users WHERE id = :id LIMIT 1');
        $stmt->execute([':id' => $user['user_id']]);
        $row = $stmt->fetch();

        if (!$row || !self::isStaffRole($row['role'])) {
            Response::error('Session invalide : reconnectez-vous.', 401);
        }
        if (!(int) $row['active']) {
            Response::error('Ce compte a été désactivé par le propriétaire.', 401);
        }
        if ((int) $row['token_version'] !== (int) ($decoded->tv ?? 0)) {
            Response::error('Session fermée : reconnectez-vous.', 401);
        }
        $last = $row['last_activity'] !== null ? (int) $row['last_activity'] : null;
        if ($last !== null && time() - $last > self::IDLE_SECONDS) {
            Response::error('Session expirée après 30 minutes d\'inactivité.', 401);
        }
        // Mise à jour de l'activité (au plus une écriture toutes les 30 s)
        if ($last === null || time() - $last > 30) {
            $pdo->prepare('UPDATE users SET last_activity_at = NOW() WHERE id = :id')->execute([':id' => $user['user_id']]);
        }
        if ((int) $row['must_change_password'] && !$allowPasswordChange) {
            Response::error('Choisissez d\'abord votre mot de passe personnel.', 403, ['code' => 'PASSWORD_CHANGE_REQUIRED']);
        }

        // Le rôle fait foi en base (un changement de rôle s'applique tout de suite)
        return [
            'user_id' => $user['user_id'],
            'role' => self::normalizeRole($row['role']),
            'name' => $row['full_name'],
        ];
    }

    /** Membre de l'équipe (propriétaire ou employé). */
    public static function requireStaff(): array
    {
        $user = self::requireAuth();
        if (!self::isStaffRole($user['role'])) {
            Response::error('Accès réservé à l\'équipe de l\'agence.', 403);
        }
        return $user;
    }

    /** Compatibilité : les anciennes routes « admin » sont ouvertes à toute l'équipe. */
    public static function requireAdmin(): array
    {
        return self::requireStaff();
    }

    public static function requireOwner(): array
    {
        $user = self::requireStaff();
        if ($user['role'] !== 'owner') {
            Response::error('Action réservée au propriétaire de l\'agence.', 403);
        }
        return $user;
    }

    public static function requireClient(): array
    {
        $user = self::requireAuth();
        if ($user['role'] !== 'client') {
            Response::error('Accès réservé aux clients.', 403);
        }
        return $user;
    }
}
