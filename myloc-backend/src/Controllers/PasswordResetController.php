<?php

declare(strict_types=1);

namespace Myloc\Controllers;

use Myloc\Config\Database;
use Myloc\Middleware\AuthMiddleware;
use Myloc\Models\User;
use Myloc\Services\Emails;
use Myloc\Utils\Audit;
use Myloc\Utils\ClientIp;
use Myloc\Utils\RateLimiter;
use Myloc\Utils\Response;
use Myloc\Utils\Validator;
use PDO;

/**
 * « Mot de passe oublié » (clients et équipe).
 * - Lien envoyé par e-mail, valable 30 minutes, utilisable une seule fois.
 * - Seule l'empreinte SHA-256 du lien est stockée en base.
 * - La réponse est identique que l'adresse existe ou non (on ne révèle pas les comptes).
 * - Après le changement : toutes les sessions sont fermées ; l'équipe garde le code à 6 chiffres.
 */
class PasswordResetController
{
    private const TTL_MINUTES = 30;
    private const GENERIC = 'Si un compte existe avec cette adresse, un e-mail vient de lui être envoyé. Pensez à vérifier vos courriers indésirables.';

    private PDO $pdo;
    private User $users;
    private RateLimiter $limiter;

    public function __construct(Database $db)
    {
        $this->pdo = $db->getPdo();
        $this->users = new User($db);
        $this->limiter = new RateLimiter($db);
    }

    public function request(): void
    {
        $input = $this->input();
        $email = strtolower(Validator::sanitizeString($input['email'] ?? ''));
        if (!Validator::email($email)) {
            Response::error('Adresse email invalide.', 422);
        }

        $ip = ClientIp::get();
        foreach (['reset:' . $email, 'reset-ip:' . $ip] as $key) {
            if (!$this->limiter->isAllowed($key)) {
                $min = (int) ceil($this->limiter->remainingLockoutSeconds($key) / 60);
                Response::error("Trop de demandes. Réessayez dans {$min} minute(s).", 429);
            }
        }
        $this->limiter->recordFailure('reset:' . $email);
        $this->limiter->recordFailure('reset-ip:' . $ip);

        $user = $this->users->findByEmail($email);
        if ($user && (int) ($user['active'] ?? 1) === 1) {
            $token = bin2hex(random_bytes(32));
            // Un seul lien valable à la fois
            $this->pdo->prepare('DELETE FROM password_resets WHERE user_id = :id')->execute([':id' => $user['id']]);
            $this->pdo->prepare('INSERT INTO password_resets (user_id, token_hash, expires_at, ip)
                VALUES (:id, :hash, DATE_ADD(NOW(), INTERVAL ' . self::TTL_MINUTES . ' MINUTE), :ip)')
                ->execute([':id' => $user['id'], ':hash' => hash('sha256', $token), ':ip' => substr($ip, 0, 45) ?: null]);

            $staff = AuthMiddleware::isStaffRole($user['role']);
            Emails::passwordReset($user, Emails::pageLink('reinitialiser', ['token' => $token]), $staff);
            if ($staff) {
                Audit::log('password_reset_requested', 'user', (int) $user['id'], [], ['user_id' => (int) $user['id'], 'name' => $user['full_name']]);
            }
        }

        Response::success(self::GENERIC);
    }

    /** Le lien est-il encore valable ? (affichage de la page) */
    public function check(): void
    {
        $row = $this->find(Validator::str($_GET['token'] ?? ''));
        Response::success('Lien valable.', [
            'first_name' => explode(' ', (string) $row['full_name'])[0],
            'staff' => AuthMiddleware::isStaffRole($row['role']),
        ]);
    }

    public function reset(): void
    {
        $input = $this->input();
        $row = $this->find(Validator::str($input['token'] ?? ''));
        $password = Validator::str($input['password'] ?? '');
        if (!Validator::stringLength($password, 8, 128)) {
            Response::error('Le mot de passe doit contenir au moins 8 caractères.', 422);
        }
        if (password_verify($password, (string) $row['password_hash'])) {
            Response::error('Choisissez un mot de passe différent de l\'ancien.', 422);
        }

        $userId = (int) $row['user_id'];
        $this->pdo->beginTransaction();
        // Usage unique : la ligne n'est « consommée » qu'une fois, même en cas de double clic
        $used = $this->pdo->prepare('UPDATE password_resets SET used_at = NOW() WHERE id = :id AND used_at IS NULL');
        $used->execute([':id' => $row['reset_id']]);
        if ($used->rowCount() !== 1) {
            $this->pdo->rollBack();
            Response::error('Ce lien a déjà été utilisé. Demandez-en un nouveau.', 410);
        }
        $this->pdo->prepare('UPDATE users SET password_hash = :hash, must_change_password = 0, token_version = token_version + 1 WHERE id = :id')
            ->execute([':hash' => password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]), ':id' => $userId]);
        $this->pdo->prepare('DELETE FROM password_resets WHERE user_id = :id AND id <> :rid')->execute([':id' => $userId, ':rid' => $row['reset_id']]);
        $this->pdo->commit();

        // Le compteur de tentatives de connexion repart à zéro
        $this->limiter->reset((string) $row['email']);
        $this->limiter->reset('agency:' . $row['email']);

        $staff = AuthMiddleware::isStaffRole($row['role']);
        if ($staff) {
            Audit::log('password_reset_email', 'user', $userId, [], ['user_id' => $userId, 'name' => $row['full_name']]);
        }
        Emails::passwordChanged(['full_name' => $row['full_name'], 'email' => $row['email']]);

        Response::success('Mot de passe modifié. Vous pouvez vous connecter.', ['staff' => $staff]);
    }

    /** Lien valable (existant, non utilisé, non expiré, compte actif) ou erreur 410. */
    private function find(string $token): array
    {
        if (!preg_match('/^[a-f0-9]{64}$/', $token)) {
            Response::error('Lien invalide. Demandez-en un nouveau.', 410);
        }
        $stmt = $this->pdo->prepare('SELECT pr.id AS reset_id, pr.user_id, pr.used_at, pr.expires_at < NOW() AS expired,
                u.full_name, u.email, u.role, u.active, u.password_hash
            FROM password_resets pr JOIN users u ON u.id = pr.user_id
            WHERE pr.token_hash = :hash LIMIT 1');
        $stmt->execute([':hash' => hash('sha256', $token)]);
        $row = $stmt->fetch();
        if (!$row) {
            Response::error('Lien invalide ou déjà remplacé par un plus récent. Demandez-en un nouveau.', 410);
        }
        if ($row['used_at'] !== null) {
            Response::error('Ce lien a déjà été utilisé. Demandez-en un nouveau.', 410);
        }
        if ((int) $row['expired']) {
            Response::error('Ce lien a expiré (30 minutes). Demandez-en un nouveau.', 410);
        }
        if (!(int) $row['active']) {
            Response::error('Ce compte est désactivé.', 410);
        }
        return $row;
    }

    private function input(): array
    {
        $data = json_decode((string) file_get_contents('php://input'), true);
        return is_array($data) ? $data : [];
    }
}
