<?php

declare(strict_types=1);

namespace Myloc\Controllers;

use Myloc\Config\Database;
use Myloc\Middleware\AuthMiddleware;
use Myloc\Models\User;
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
            Response::error('Missing required fields.', 422, ['missing' => $required]);
        }

        $fullName = Validator::sanitizeString($input['full_name']);
        $email = strtolower(Validator::sanitizeString($input['email']));
        $phone = Validator::sanitizeString($input['phone']);
        $password = $input['password'];

        if (!Validator::email($email)) {
            Response::error('Invalid email format.', 422);
        }
        if (!Validator::stringLength($fullName, 2, 100)) {
            Response::error('Full name must be between 2 and 100 characters.', 422);
        }
        if (!Validator::stringLength($phone, 5, 20)) {
            Response::error('Phone must be between 5 and 20 characters.', 422);
        }
        if (!Validator::stringLength($password, 8, 128)) {
            Response::error('Password must be at least 8 characters.', 422);
        }

        if ($this->userModel->emailExists($email)) {
            Response::error('Email already registered.', 409);
        }

        $hash = password_hash($password, PASSWORD_BCRYPT);
        $userId = $this->userModel->create($fullName, $email, $phone, $hash);

        $token = JwtHelper::encode($userId, 'client');

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
            Response::error('Missing required fields.', 422, ['missing' => $required]);
        }

        $email = strtolower(Validator::sanitizeString($input['email']));
        $password = $input['password'];

        $identifier = $email;
        if (!$this->rateLimiter->isAllowed($identifier)) {
            $remaining = $this->rateLimiter->remainingLockoutSeconds($identifier);
            Response::error("Too many failed login attempts. Please try again in {$remaining} seconds.", 429);
        }

        $user = $this->userModel->findByEmail($email);
        if (!$user || !password_verify($password, $user['password_hash'])) {
            $this->rateLimiter->recordFailure($identifier);
            $remaining = $this->maxAttemptsRemaining($identifier);
            Response::error("Invalid email or password. {$remaining} attempts remaining.", 401);
        }

        $this->rateLimiter->reset($identifier);

        $token = JwtHelper::encode((int) $user['id'], $user['role']);

        Response::success('Login successful.', [
            'user_id' => (int) $user['id'],
            'role' => $user['role'],
            'token' => $token,
        ]);
    }

    public function me(): void
    {
        $user = AuthMiddleware::requireAuth();
        $profile = $this->userModel->findById($user['user_id']);

        if (!$profile) {
            Response::error('User not found.', 404);
        }

        unset($profile['password_hash']);
        Response::success('User profile.', ['user' => $profile]);
    }

    public function listClients(): void
    {
        AuthMiddleware::requireAdmin();
        $clients = $this->userModel->findByRole('client');
        Response::success('Clients retrieved.', ['clients' => $clients]);
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
