<?php

declare(strict_types=1);

namespace Myloc\Middleware;

class CorsMiddleware
{
    public static function apply(): void
    {
        // Allow all origins unconditionally — required for GitHub Pages + Cloudflare tunnel.
        header('Access-Control-Allow-Origin: *');
        header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
        header('Access-Control-Max-Age: 86400');

        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            http_response_code(204);
            exit;
        }
    }
}
