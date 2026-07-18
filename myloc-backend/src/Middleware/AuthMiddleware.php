<?php

declare(strict_types=1);

namespace Myloc\Middleware;

use Myloc\Config\Database;
use Myloc\Utils\JwtHelper;
use Myloc\Utils\Response;

class AuthMiddleware
{
    public static function requireAuth(): array
    {
        $header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
        if ($header === '' || !str_starts_with($header, 'Bearer ')) {
            Response::error('Authentication required.', 401);
        }

        $token = substr($header, 7);
        if ($token === '') {
            Response::error('Authentication required.', 401);
        }

        try {
            $decoded = JwtHelper::decode($token);
        } catch (\RuntimeException $e) {
            Response::error($e->getMessage(), 401);
        }

        if (!isset($decoded->sub, $decoded->role)) {
            Response::error('Invalid token payload.', 401);
        }

        return [
            'user_id' => (int) $decoded->sub,
            'role' => $decoded->role,
        ];
    }

    public static function requireAdmin(): array
    {
        $user = self::requireAuth();
        if ($user['role'] !== 'admin') {
            Response::error('Forbidden: admin access required.', 403);
        }
        return $user;
    }

    public static function requireClient(): array
    {
        $user = self::requireAuth();
        if ($user['role'] !== 'client') {
            Response::error('Forbidden: client access required.', 403);
        }
        return $user;
    }
}
