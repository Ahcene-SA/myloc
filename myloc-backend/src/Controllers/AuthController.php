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
use Myloc\Utils\Validator;

class AuthController
{
    private User $userModel;
    private RateLimiter $rateLimiter;

    public function __construct(Database $db)
    {
        $this->userModel = new User($db);
        $this->rateLimiter = new RateLimiter($db);
    }

    public function register(): void
    {
        $input = $this->getJsonInput();

        $required = Validator::required($input, ['full_name', 'email', 'phone', 'password']);
        if (!empty($required)) {
            Response::error('Champs obligatoires manquants.', 422, ['missing' => $required]);
        }

        $fullName = Validator::sanitizeString($input['full_name']);
        $email = strtolower(Validator::sanitizeString($input['email']));
        $phone = Validator::sanitizeString($input['phone']);
        $password = $input['password'];

        if (!Validator::email($email)) {
            Response::error('Adresse email invalide.', 422);
        }
        if (!Validator::stringLength($fullName, 2, 100)) {
            Response::error('Le nom doit contenir entre 2 et 100 caractères.', 422);
        }
        if (!Validator::stringLength($phone, 5, 20)) {
            Response::error('Le téléphone doit contenir entre 5 et 20 caractères.', 422);
        }
        if (!Validator::stringLength($password, 8, 128)) {
            Response::error('Le mot de passe doit contenir au moins 8 caractères.', 422);
        }

        if ($this->userModel->emailExists($email)) {
            Response::error('Un compte existe déjà avec cet email.', 409);
        }

        $hash = password_hash($password, PASSWORD_BCRYPT);
        $userId = $this->userModel->create($fullName, $email, $phone, $hash);

        $token = JwtHelper::encode($userId, 'client', ['scope' => 'client']);

        Response::success('Registration successful.', [
            'user_id' => $userId,
            'role' => 'client',
            'token' => $token,
        ], 201);
    }

    public function login(): void
    {
        $input = $this->getJsonInput();

        $required = Validator::required($input, ['email', 'password']);
        if (!empty($required)) {
            Response::error('Champs obligatoires manquants.', 422, ['missing' => $required]);
        }

        $email = strtolower(Validator::sanitizeString($input['email']));
        $password = $input['password'];

        $identifier = $email;
        if (!$this->rateLimiter->isAllowed($identifier)) {
            $remaining = $this->rateLimiter->remainingLockoutSeconds($identifier);
            Response::error("Trop de tentatives. Réessayez dans {$remaining} secondes.", 429);
        }

        $user = $this->userModel->findByEmail($email);
        if (!$user || !password_verify($password, $user['password_hash'])) {
            $this->rateLimiter->recordFailure($identifier);
            $remaining = $this->maxAttemptsRemaining($identifier);
            Response::error("Email ou mot de passe incorrect ({$remaining} essai(s) restant(s)).", 401);
        }

        $this->rateLimiter->reset($identifier);

        // L'équipe de l'agence a sa propre porte d'entrée (avec code à 6 chiffres)
        if (AuthMiddleware::isStaffRole($user['role'])) {
            Response::error('Ce compte appartient à l\'équipe de l\'agence : connectez-vous depuis l\'espace agence.', 403, ['code' => 'USE_AGENCY_LOGIN']);
        }

        $token = JwtHelper::encode((int) $user['id'], $user['role'], ['scope' => 'client']);

        Response::success('Login successful.', [
            'user_id' => (int) $user['id'],
            'role' => $user['role'],
            'token' => $token,
        ]);
    }

    public function me(): void
    {
        $user = AuthMiddleware::requireAuth(true);
        $profile = $this->userModel->findById($user['user_id']);

        if (!$profile) {
            Response::error('Utilisateur introuvable.', 404);
        }

        unset($profile['password_hash']);
        Response::success('User profile.', ['user' => $profile]);
    }

    /** Mise à jour du profil (nom, téléphone) de l'utilisateur connecté. */
    public function updateMe(): void
    {
        $user = AuthMiddleware::requireAuth();
        $input = $this->getJsonInput();

        $fullName = Validator::sanitizeString((string) ($input['full_name'] ?? ''));
        $phone = Validator::sanitizeString((string) ($input['phone'] ?? ''));
        if (!Validator::stringLength($fullName, 2, 100)) {
            Response::error('Le nom doit contenir entre 2 et 100 caractères.', 422);
        }
        if (!Validator::stringLength($phone, 5, 20)) {
            Response::error('Le téléphone doit contenir entre 5 et 20 caractères.', 422);
        }

        $this->userModel->updateProfile($user['user_id'], $fullName, $phone);
        Response::success('Profil mis à jour.', ['user' => $this->userModel->findById($user['user_id'])]);
    }

    /** Changement de mot de passe (mot de passe actuel requis). */
    public function changePassword(): void
    {
        $user = AuthMiddleware::requireAuth(true);
        $input = $this->getJsonInput();

        $current = (string) ($input['current_password'] ?? '');
        $new = (string) ($input['new_password'] ?? '');
        $hash = $this->userModel->getPasswordHash($user['user_id']);
        if ($hash === null || !password_verify($current, $hash)) {
            Response::error('Mot de passe actuel incorrect.', 422);
        }
        if (!Validator::stringLength($new, 8, 128)) {
            Response::error('Le nouveau mot de passe doit contenir au moins 8 caractères.', 422);
        }
        if (hash_equals($current, $new)) {
            Response::error('Choisissez un mot de passe différent de l\'actuel.', 422);
        }

        $this->userModel->updatePassword($user['user_id'], password_hash($new, PASSWORD_BCRYPT));
        if (AuthMiddleware::isStaffRole($user['role'])) {
            $this->userModel->clearMustChangePassword($user['user_id']);
            Audit::log('password_changed', 'user', $user['user_id']);
        }
        Response::success('Mot de passe modifié.');
    }

    public function listClients(): void
    {
        AuthMiddleware::requireStaff();
        $clients = $this->userModel->findClientsWithStats();
        Response::success('Clients récupérés.', ['clients' => $clients]);
    }

    private function getJsonInput(): array
    {
        $raw = file_get_contents('php://input');
        $data = json_decode($raw, true);
        return is_array($data) ? $data : [];
    }

    private function maxAttemptsRemaining(string $identifier): int
    {
        $pdo = $this->rateLimiter->getDatabasePdo();
        $stmt = $pdo->prepare("
            SELECT attempts
            FROM login_attempts
            WHERE identifier = :identifier
        ");
        $stmt->execute([':identifier' => $identifier]);
        $row = $stmt->fetch();

        if (!$row) {
            return 5;
        }

        $max = (int) ($_ENV['RATE_LIMIT_MAX_ATTEMPTS'] ?? 5);
        return max(0, $max - (int) $row['attempts']);
    }
}
