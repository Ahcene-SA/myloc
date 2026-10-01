<?php

declare(strict_types=1);

namespace Myloc\Controllers;

use Myloc\Config\Database;
use Myloc\Middleware\AuthMiddleware;
use Myloc\Models\User;
use Myloc\Utils\Audit;
use Myloc\Utils\ClientIp;
use Myloc\Utils\JwtHelper;
use Myloc\Utils\RateLimiter;
use Myloc\Utils\Response;
use Myloc\Utils\Validator;

class AuthController
{
    private User $userModel;
    private RateLimiter $rateLimiter;
    private RateLimiter $ipLimiter;

    /** Échecs de connexion tolérés par adresse IP sur la fenêtre IP_WINDOW_SECONDS. */
    public const IP_MAX_FAILURES = 20;
    public const IP_WINDOW_SECONDS = 900;

    public function __construct(Database $db)
    {
        $this->userModel = new User($db);
        $this->rateLimiter = new RateLimiter($db);
        $this->ipLimiter = new RateLimiter($db, self::IP_MAX_FAILURES, self::IP_WINDOW_SECONDS);
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
        $password = is_string($input['password']) ? $input['password'] : '';

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
        if (!is_string($input['email']) || !is_string($input['password'])) {
            Response::error('Email ou mot de passe invalide.', 422);
        }

        $email = strtolower(Validator::sanitizeString($input['email']));
        $password = $input['password'];

        // Limite par adresse IP (essais sur de nombreux comptes différents)
        $ipKey = self::ipKey();
        if (!$this->ipLimiter->isAllowed($ipKey)) {
            $min = max(1, (int) ceil($this->ipLimiter->remainingLockoutSeconds($ipKey) / 60));
            Response::error("Trop de tentatives depuis cette connexion. Réessayez dans {$min} minute(s).", 429);
        }

        // Un compte de l'équipe partage le compteur de l'espace agence : on ne peut pas
        // contourner son blocage en essayant les mots de passe depuis la connexion client.
        $user = $this->userModel->findByEmail($email);
        $staff = $user && AuthMiddleware::isStaffRole($user['role']);
        $identifier = $staff ? 'agency:' . $email : $email;
        if (!$this->rateLimiter->isAllowed($identifier)) {
            $remaining = $this->rateLimiter->remainingLockoutSeconds($identifier);
            Response::error("Trop de tentatives. Réessayez dans {$remaining} secondes.", 429);
        }

        if (!$user || !password_verify($password, $user['password_hash'])) {
            $this->rateLimiter->recordFailure($identifier);
            $this->ipLimiter->recordFailure($ipKey);
            $remaining = $this->rateLimiter->remainingAttempts($identifier);
            Response::error("Email ou mot de passe incorrect ({$remaining} essai(s) restant(s)).", 401);
        }

        $this->rateLimiter->reset($identifier);

        // L'équipe de l'agence a sa propre porte d'entrée (avec code à 6 chiffres)
        if ($staff) {
            Response::error('Ce compte appartient à l\'équipe de l\'agence : connectez-vous depuis l\'espace agence.', 403, ['code' => 'USE_AGENCY_LOGIN']);
        }

        $token = JwtHelper::encode((int) $user['id'], $user['role'], ['scope' => 'client', 'tv' => (int) ($user['token_version'] ?? 0)]);

        Response::success('Login successful.', [
            'user_id' => (int) $user['id'],
            'role' => $user['role'],
            'token' => $token,
        ]);
    }

    /** Clé du compteur « par adresse IP », partagée par la connexion client et la connexion agence. */
    public static function ipKey(): string
    {
        return 'login-ip:' . ClientIp::get();
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

        $fullName = Validator::sanitizeString($input['full_name'] ?? '');
        $phone = Validator::sanitizeString($input['phone'] ?? '');
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

        $current = is_string($input['current_password'] ?? null) ? $input['current_password'] : '';
        $new = is_string($input['new_password'] ?? null) ? $input['new_password'] : '';
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
        // Les autres appareils sont déconnectés ; cet appareil reçoit un nouveau jeton
        $this->userModel->bumpTokenVersion($user['user_id']);
        $staff = AuthMiddleware::isStaffRole($user['role']);
        if ($staff) {
            $this->userModel->clearMustChangePassword($user['user_id']);
            Audit::log('password_changed', 'user', $user['user_id']);
        }
        $fresh = $this->userModel->findRawById($user['user_id']);
        $tv = (int) ($fresh['token_version'] ?? 0);
        $token = $staff
            ? JwtHelper::encode($user['user_id'], $user['role'], ['scope' => 'agency', 'tv' => $tv], AuthMiddleware::AGENCY_SESSION_SECONDS)
            : JwtHelper::encode($user['user_id'], $user['role'], ['scope' => 'client', 'tv' => $tv]);
        Response::success('Mot de passe modifié. Vos autres appareils ont été déconnectés.', ['token' => $token]);
    }

    public function listClients(): void
    {
        // L'annuaire clients est une information sensible (coordonnées, dépenses) :
        // réservé au propriétaire, comme l'équipe et les journaux.
        AuthMiddleware::requireOwner();
        $clients = $this->userModel->findClientsWithStats();
        Response::success('Clients récupérés.', ['clients' => $clients]);
    }

    /** Déconnexion partout : invalide le jeton actuel et tous les autres (version de jeton). */
    public function logoutAllDevices(): void
    {
        $user = AuthMiddleware::requireClient();
        $this->userModel->bumpTokenVersion((int) $user['user_id']);
        Audit::log('client_logout_all', 'user', (int) $user['user_id']);
        Response::success('Déconnecté de tous les appareils. Reconnectez-vous.');
    }

    private function getJsonInput(): array
    {
        $raw = file_get_contents('php://input');
        $data = json_decode($raw, true);
        return is_array($data) ? $data : [];
    }
}
