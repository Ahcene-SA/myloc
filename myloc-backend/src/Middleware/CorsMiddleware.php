<?php

declare(strict_types=1);

namespace Myloc\Middleware;

class CorsMiddleware
{
    public static function apply(): void
    {
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
        $allowed = self::getAllowedOrigins();

        if ($origin !== '' && self::isAllowed($origin, $allowed)) {
            header("Access-Control-Allow-Origin: {$origin}");
            header('Access-Control-Allow-Credentials: true');
        }

        header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
        header('Access-Control-Max-Age: 86400');

        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            http_response_code(204);
            exit;
        }
    }

    private static function getAllowedOrigins(): array
    {
        $raw = $_ENV['ALLOWED_ORIGINS'] ?? '';
        if ($raw === '') {
            return [];
        }
        return array_map('trim', explode(',', $raw));
    }

    private static function isAllowed(string $origin, array $allowed): bool
    {
        foreach ($allowed as $value) {
            if ($value === '*') {
                return true;
            }
            if ($origin === $value) {
                return true;
            }
        }
        return false;
    }
}
