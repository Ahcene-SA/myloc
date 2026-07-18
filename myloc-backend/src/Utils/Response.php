<?php

declare(strict_types=1);

namespace Myloc\Utils;

class Response
{
    public static function json(array $data, int $status = 200): void
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }

    public static function success(string $message, array $data = [], int $status = 200): void
    {
        self::json(array_merge(['success' => true, 'message' => $message], $data), $status);
    }

    public static function error(string $message, int $status = 400, array $details = []): void
    {
        $payload = ['success' => false, 'error' => $message];
        if (!empty($details)) {
            $payload['details'] = $details;
        }
        self::json($payload, $status);
    }
}
