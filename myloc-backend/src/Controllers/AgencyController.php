<?php

declare(strict_types=1);

namespace Myloc\Controllers;

use Myloc\Config\Database;
use Myloc\Middleware\AuthMiddleware;
use Myloc\Models\User;
use Myloc\Utils\Audit;
use Myloc\Utils\JwtHelper;
use Myloc\Utils\RateLimiter;
use Myloc\Utils\Response;
use Myloc\Utils\Totp;
use Myloc\Utils\Validator;

/**
 * Espace agence : connexion de l'équipe (avec code à 6 chiffres), comptes des employés,
 * sessions et journal d'activité.
 */
class AgencyController
{
    private User $users;
    private RateLimiter $rateLimiter;
    private Database $db;

    public function __construct(Database $db)
    {
        $this->db = $db;
        $this->users = new User($db);
        $this->rateLimiter = new RateLimiter($db);
    }

    /* ───────────── Connexion ───────────── */

    public function login(): void
    {
        $in = $this->json();
        $email = strtolower(Validator::sanitizeString((string) ($in['email'] ?? '')));
        $password = (string) ($in['password'] ?? '');
        if ($email === '' || $password === '') {
            Response::error('Email et mot de passe obligatoires.', 422);
        }

        $key = 'agency:' . $email;
        if (!$this->rateLimiter->isAllowed($key)) {
            $remaining = $this->rateLimiter->remainingLockoutSeconds($key);
            Response::error('Trop de tentatives. Compte bloqué ' . max(1, (int) ceil($remaining / 60)) . ' min.', 429);
        }

        $user = $this->users->findByEmail($email);
        $valid = $user && AuthMiddleware::isStaffRole($user['role']) && password_verify($password, $user['password_hash']);
        if (!$valid) {
            $this->rateLimiter->recordFailure($key);
            Audit::log('login_failed', 'user', $user ? (int) $user['id'] : null, ['email' => $email], $user ? ['user_id' => (int) $user['id'], 'name' => $user['full_name']] : null);
            Response::error('Email ou mot de passe incorrect.', 401);
        }
        if (!(int) $user['active']) {
            Audit::log('login_refused_inactive', 'user', (int) $user['id'], [], ['user_id' => (int) $user['id'], 'name' => $user['full_name']]);
            Response::error('Ce compte a été désactivé. Contactez le propriétaire de l\'agence.', 403);
        }
        $this->rateLimiter->reset($key);

        $id = (int) $user['id'];
        $role = AuthMiddleware::normalizeRole($user['role']);

        // 2FA déjà activée : on demande le code
        if ((int) $user['totp_enabled'] && $user['totp_secret']) {
            Response::success('Code requis.', ['step' => 'totp', 'challenge' => $this->challenge($user, false)]);
        }

        // Propriétaire sans 2FA : mise en place obligatoire
        if ($role === 'owner') {
            $secret = Totp::generateSecret();
            $this->users->setTotpSecret($id, $secret);
            Response::success('Activez la double authentification.', [
                'step' => 'totp_setup',
                'challenge' => $this->challenge($user, true),
                'secret' => $secret,
                'otpauth' => Totp::uri($secret, $user['email']),
            ]);
        }

        $this->issueSession($user);
    }

    /** Deuxième étape : code de l'application (ou code de secours). */
    public function verifyTotp(): void
    {
        $in = $this->json();
        try {
            $claims = JwtHelper::decode((string) ($in['challenge'] ?? ''));
        } catch (\RuntimeException $e) {
            Response::error('Délai dépassé : reconnectez-vous.', 401);
        }
        if (($claims->scope ?? '') !== 'mfa') {
            Response::error('Session invalide : reconnectez-vous.', 401);
        }
        $user = $this->users->findRawById((int) $claims->sub);
        if (!$user || !(int) $user['active'] || (int) $user['token_version'] !== (int) ($claims->tv ?? -1) || !$user['totp_secret']) {
            Response::error('Session invalide : reconnectez-vous.', 401);
        }

        $key = 'mfa:' . $user['id'];
        if (!$this->rateLimiter->isAllowed($key)) {
            Response::error('Trop de codes incorrects. Réessayez dans quelques minutes.', 429);
        }

        $code = (string) ($in['code'] ?? '');
        $recovery = strtoupper(trim((string) ($in['recovery_code'] ?? '')));
        $setup = !empty($claims->setup);
        $actor = ['user_id' => (int) $user['id'], 'name' => $user['full_name']];

        if ($recovery !== '' && !$setup) {
            $hashes = json_decode((string) $user['recovery_codes'], true) ?: [];
            $match = null;
            foreach ($hashes as $i => $h) {
                if (password_verify($recovery, $h)) {
                    $match = $i;
                    break;
                }
            }
            if ($match === null) {
                $this->rateLimiter->recordFailure($key);
                Response::error('Code de secours incorrect ou déjà utilisé.', 422);
            }
            unset($hashes[$match]);
            $this->users->saveRecoveryCodes((int) $user['id'], $hashes);
            $this->rateLimiter->reset($key);
            Audit::log('login_recovery_code', 'user', (int) $user['id'], ['remaining' => count($hashes)], $actor);
            $this->issueSession($user, ['recovery_codes_left' => count($hashes)]);
        }

        if (!Totp::verify($user['totp_secret'], $code)) {
            $this->rateLimiter->recordFailure($key);
            Response::error('Code incorrect. Vérifiez l\'heure de votre téléphone et réessayez.', 422);
        }
        $this->rateLimiter->reset($key);

        $extra = [];
        if ($setup) {
            [$plain, $hashed] = Totp::recoveryCodes();
            $this->users->enableTotp((int) $user['id'], $hashed);
            Audit::log('2fa_enabled', 'user', (int) $user['id'], [], $actor);
            $extra['recovery_codes'] = $plain;
        }
        $this->issueSession($user, $extra);
    }

    public function me(): void
    {
        $auth = AuthMiddleware::requireAuth(true);
        if (!AuthMiddleware::isStaffRole($auth['role'])) {
            Response::error('Accès réservé à l\'équipe de l\'agence.', 403);
        }
        Response::success('Profil.', ['user' => $this->users->findById($auth['user_id'])]);
    }

    /** Ferme toutes les sessions ouvertes du compte (tous les appareils). */
    public function logoutAll(): void
    {
        $auth = AuthMiddleware::requireStaff();
        $this->users->bumpTokenVersion($auth['user_id']);
        Audit::log('logout_all', 'user', $auth['user_id']);
        Response::success('Tous vos appareils ont été déconnectés.');
    }

    /* ───────────── 2FA depuis « Mon compte » ───────────── */

    public function twoFactorSetup(): void
    {
        $auth = AuthMiddleware::requireStaff();
        $user = $this->users->findRawById($auth['user_id']);
        if ((int) $user['totp_enabled']) {
            Response::error('La double authentification est déjà activée.', 409);
        }
        $secret = Totp::generateSecret();
        $this->users->setTotpSecret($auth['user_id'], $secret);
        Response::success('Scannez le QR code.', ['secret' => $secret, 'otpauth' => Totp::uri($secret, $user['email'])]);
    }

    public function twoFactorEnable(): void
    {
        $auth = AuthMiddleware::requireStaff();
        $user = $this->users->findRawById($auth['user_id']);
        if (!$user['totp_secret'] || (int) $user['totp_enabled']) {
            Response::error('Recommencez l\'activation.', 409);
        }
        if (!Totp::verify($user['totp_secret'], (string) ($this->json()['code'] ?? ''))) {
            Response::error('Code incorrect. Vérifiez l\'heure de votre téléphone et réessayez.', 422);
        }
        [$plain, $hashed] = Totp::recoveryCodes();
        $this->users->enableTotp($auth['user_id'], $hashed);
        Audit::log('2fa_enabled', 'user', $auth['user_id']);
        Response::success('Double authentification activée.', ['recovery_codes' => $plain]);
    }

    /** Nouveaux codes de secours (les anciens ne marchent plus). */
    public function regenerateRecoveryCodes(): void
    {
        $auth = AuthMiddleware::requireStaff();
        $user = $this->users->findRawById($auth['user_id']);
        if (!(int) $user['totp_enabled'] || !Totp::verify((string) $user['totp_secret'], (string) ($this->json()['code'] ?? ''))) {
            Response::error('Code incorrect.', 422);
        }
        [$plain, $hashed] = Totp::recoveryCodes();
        $this->users->saveRecoveryCodes($auth['user_id'], $hashed);
        Audit::log('2fa_recovery_regenerated', 'user', $auth['user_id']);
        Response::success('Nouveaux codes de secours.', ['recovery_codes' => $plain]);
    }

    /** Un employé peut retirer sa 2FA ; le propriétaire, jamais. */
    public function twoFactorDisable(): void
    {
        $auth = AuthMiddleware::requireStaff();
        if ($auth['role'] === 'owner') {
            Response::error('La double authentification est obligatoire pour le propriétaire.', 403);
        }
        $hash = $this->users->getPasswordHash($auth['user_id']);
        if (!$hash || !password_verify((string) ($this->json()['password'] ?? ''), $hash)) {
            Response::error('Mot de passe incorrect.', 422);
        }
        $this->users->setTotpSecret($auth['user_id'], null);
        Audit::log('2fa_disabled', 'user', $auth['user_id']);
        Response::success('Double authentification désactivée.');
    }

    /* ───────────── Équipe (propriétaire) ───────────── */

    public function team(): void
    {
        AuthMiddleware::requireOwner();
        Response::success('Équipe.', ['team' => $this->users->findStaff()]);
    }

    public function createMember(): void
    {
        AuthMiddleware::requireOwner();
        $in = $this->json();
        $fullName = Validator::sanitizeString((string) ($in['full_name'] ?? ''));
        $email = strtolower(Validator::sanitizeString((string) ($in['email'] ?? '')));
        $phone = Validator::sanitizeString((string) ($in['phone'] ?? ''));
        $agency = Validator::sanitizeString((string) ($in['agency'] ?? ''));
        $role = ($in['role'] ?? 'employee') === 'owner' ? 'owner' : 'employee';

        if (!Validator::stringLength($fullName, 2, 100)) {
            Response::error('Le nom doit contenir entre 2 et 100 caractères.', 422);
        }
        if (!Validator::email($email)) {
            Response::error('Adresse email invalide.', 422);
        }
        if (!Validator::stringLength($phone, 5, 20)) {
            Response::error('Le téléphone doit contenir entre 5 et 20 caractères.', 422);
        }
        if ($this->users->emailExists($email)) {
            Response::error('Un compte existe déjà avec cet email.', 409);
        }

        $temp = $this->temporaryPassword();
        $id = $this->users->createStaff($fullName, $email, $phone, $role, $agency !== '' ? $agency : null, password_hash($temp, PASSWORD_BCRYPT));
        Audit::log('member_created', 'user', $id, ['name' => $fullName, 'email' => $email, 'role' => $role]);
        Response::success('Compte créé.', ['member' => $this->users->findById($id), 'temporary_password' => $temp], 201);
    }

    public function updateMember(array $params): void
    {
        $auth = AuthMiddleware::requireOwner();
        $id = (int) $params['id'];
        $member = $this->staffOr404($id);
        $in = $this->json();
        $fields = [];
        $changes = [];

        if (array_key_exists('full_name', $in)) {
            $v = Validator::sanitizeString((string) $in['full_name']);
            if (!Validator::stringLength($v, 2, 100)) {
                Response::error('Le nom doit contenir entre 2 et 100 caractères.', 422);
            }
            $fields['full_name'] = $v;
        }
        if (array_key_exists('phone', $in)) {
            $v = Validator::sanitizeString((string) $in['phone']);
            if (!Validator::stringLength($v, 5, 20)) {
                Response::error('Le téléphone doit contenir entre 5 et 20 caractères.', 422);
            }
            $fields['phone'] = $v;
        }
        if (array_key_exists('agency', $in)) {
            $v = Validator::sanitizeString((string) $in['agency']);
            $fields['agency'] = $v !== '' ? $v : null;
        }
        if (array_key_exists('role', $in)) {
            $role = $in['role'] === 'owner' ? 'owner' : 'employee';
            if ($role !== $member['role']) {
                if ($member['role'] === 'owner' && $this->users->countActiveOwners() <= 1) {
                    Response::error('Il doit rester au moins un propriétaire.', 422);
                }
                if ($id === $auth['user_id']) {
                    Response::error('Vous ne pouvez pas changer votre propre rôle.', 422);
                }
                $fields['role'] = $role;
                $changes['role'] = [$member['role'], $role];
            }
        }
        if (array_key_exists('active', $in)) {
            $active = (bool) $in['active'];
            if (!$active && $id === $auth['user_id']) {
                Response::error('Vous ne pouvez pas désactiver votre propre compte.', 422);
            }
            if (!$active && $member['role'] === 'owner' && $this->users->countActiveOwners() <= 1) {
                Response::error('Il doit rester au moins un propriétaire actif.', 422);
            }
            if ($active !== $member['active']) {
                $fields['active'] = $active ? 1 : 0;
                $changes['active'] = [$member['active'], $active];
            }
        }

        $this->users->updateStaff($id, $fields);
        if (isset($fields['active']) && !$fields['active']) {
            $this->users->bumpTokenVersion($id); // coupé tout de suite
        }
        if (isset($changes['active'])) {
            Audit::log($changes['active'][1] ? 'member_activated' : 'member_deactivated', 'user', $id, ['name' => $member['full_name']]);
        }
        if (isset($changes['role'])) {
            Audit::log('member_role_changed', 'user', $id, ['name' => $member['full_name'], 'from' => $changes['role'][0], 'to' => $changes['role'][1]]);
        }
        $rest = array_diff_key($fields, ['active' => 1, 'role' => 1]);
        if ($rest) {
            Audit::log('member_updated', 'user', $id, ['name' => $member['full_name']] + $rest);
        }
        Response::success('Compte mis à jour.', ['member' => $this->users->findById($id)]);
    }

    public function resetMemberPassword(array $params): void
    {
        $auth = AuthMiddleware::requireOwner();
        $id = (int) $params['id'];
        $member = $this->staffOr404($id);
        if ($id === $auth['user_id']) {
            Response::error('Changez votre propre mot de passe depuis « Mon compte ».', 422);
        }
        $temp = $this->temporaryPassword();
        $this->users->setTemporaryPassword($id, password_hash($temp, PASSWORD_BCRYPT));
        Audit::log('member_password_reset', 'user', $id, ['name' => $member['full_name']]);
        Response::success('Mot de passe réinitialisé.', ['temporary_password' => $temp]);
    }

    public function resetMemberTwoFactor(array $params): void
    {
        $auth = AuthMiddleware::requireOwner();
        $id = (int) $params['id'];
        $member = $this->staffOr404($id);
        if ($id === $auth['user_id']) {
            Response::error('Utilisez vos codes de secours pour votre propre compte.', 422);
        }
        $this->users->setTotpSecret($id, null);
        $this->users->bumpTokenVersion($id);
        Audit::log('member_2fa_reset', 'user', $id, ['name' => $member['full_name']]);
        Response::success('Double authentification réinitialisée : elle sera redemandée à la prochaine connexion si nécessaire.');
    }

    /* ───────────── Journal ───────────── */

    public function auditLog(): void
    {
        $auth = AuthMiddleware::requireStaff();
        $entityType = (string) ($_GET['entity_type'] ?? '');
        $entityId = (int) ($_GET['entity_id'] ?? 0);
        // Un employé peut voir l'historique d'une réservation, pas le journal complet
        if ($auth['role'] !== 'owner' && !($entityType === 'reservation' && $entityId > 0)) {
            Response::error('Action réservée au propriétaire de l\'agence.', 403);
        }

        $where = [];
        $p = [];
        if ($entityType !== '') {
            $where[] = 'entity_type = :et';
            $p[':et'] = $entityType;
        }
        if ($entityId > 0) {
            $where[] = 'entity_id = :eid';
            $p[':eid'] = $entityId;
        }
        if (!empty($_GET['user_id'])) {
            $where[] = 'user_id = :uid';
            $p[':uid'] = (int) $_GET['user_id'];
        }
        if (!empty($_GET['action'])) {
            $where[] = 'action LIKE :action';
            $p[':action'] = preg_replace('/[^a-z0-9_]/', '', (string) $_GET['action']) . '%';
        }
        if (!empty($_GET['from']) && Validator::date((string) $_GET['from'])) {
            $where[] = 'created_at >= :from';
            $p[':from'] = $_GET['from'] . ' 00:00:00';
        }
        if (!empty($_GET['to']) && Validator::date((string) $_GET['to'])) {
            $where[] = 'created_at <= :to';
            $p[':to'] = $_GET['to'] . ' 23:59:59';
        }
        $limit = min(200, max(1, (int) ($_GET['limit'] ?? 50)));
        $offset = max(0, (int) ($_GET['offset'] ?? 0));
        $sql = 'SELECT * FROM audit_logs' . ($where ? ' WHERE ' . implode(' AND ', $where) : '');

        $pdo = $this->db->getPdo();
        $count = $pdo->prepare(str_replace('SELECT *', 'SELECT COUNT(*)', $sql));
        $count->execute($p);
        $stmt = $pdo->prepare($sql . " ORDER BY id DESC LIMIT {$limit} OFFSET {$offset}");
        $stmt->execute($p);
        $rows = array_map(function (array $r) {
            $r['details'] = $r['details'] ? json_decode($r['details'], true) : null;
            return $r;
        }, $stmt->fetchAll());

        Response::success('Journal.', ['entries' => $rows, 'total' => (int) $count->fetchColumn()]);
    }

    /* ───────────── Outils ───────────── */

    private function issueSession(array $user, array $extra = []): void
    {
        $id = (int) $user['id'];
        $this->users->touchLogin($id);
        $role = AuthMiddleware::normalizeRole($user['role']);
        $token = JwtHelper::encode($id, $role, ['scope' => 'agency', 'tv' => (int) $user['token_version']], AuthMiddleware::AGENCY_SESSION_SECONDS);
        Audit::log('login', 'user', $id, [], ['user_id' => $id, 'name' => $user['full_name']]);
        Response::success('Connexion réussie.', array_merge([
            'step' => 'done',
            'token' => $token,
            'role' => $role,
            'user' => $this->users->findById($id),
        ], $extra));
    }

    /** Jeton court (5 min) qui prouve que le mot de passe est bon, en attendant le code. */
    private function challenge(array $user, bool $setup): string
    {
        return JwtHelper::encode(
            (int) $user['id'],
            AuthMiddleware::normalizeRole($user['role']),
            ['scope' => 'mfa', 'setup' => $setup, 'tv' => (int) $user['token_version']],
            $setup ? 900 : 300
        );
    }

    private function staffOr404(int $id): array
    {
        $member = $this->users->findById($id);
        if (!$member || !AuthMiddleware::isStaffRole($member['role'])) {
            Response::error('Membre de l\'équipe introuvable.', 404);
        }
        return $member;
    }

    /** Mot de passe provisoire lisible : 3 groupes de 4 caractères sans ambiguïté (0/O, 1/l). */
    private function temporaryPassword(): string
    {
        $alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
        $parts = [];
        for ($g = 0; $g < 3; $g++) {
            $s = '';
            for ($i = 0; $i < 4; $i++) {
                $s .= $alphabet[random_int(0, strlen($alphabet) - 1)];
            }
            $parts[] = $s;
        }
        return implode('-', $parts);
    }

    private function json(): array
    {
        $data = json_decode((string) file_get_contents('php://input'), true);
        return is_array($data) ? $data : [];
    }
}
