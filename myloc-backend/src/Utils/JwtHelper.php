<?php

declare(strict_types=1);

namespace Myloc\Utils;

use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Firebase\JWT\ExpiredException;
use Firebase\JWT\SignatureInvalidException;

class JwtHelper
{
    public static function encode(int $userId, string $role): string
    {
        $secret = $_ENV['JWT_SECRET'] ?? '';
        if ($secret === '') {
            throw new \RuntimeException('JWT secret is not configured.');
        }

        $expiry = (int) ($_ENV['JWT_EXPIRY'] ?? 3600);
        $issuedAt = time();

        $payload = [
            'iat' => $issuedAt,
            'exp' => $issuedAt + $expiry,
            'sub' => $userId,
            'role' => $role,
        ];

        return JWT::encode($payload, $secret, 'HS256');
    }

    public static function decode(string $token): object
    {
        $secret = $_ENV['JWT_SECRET'] ?? '';
        if ($secret === '') {
            throw new \RuntimeException('JWT secret is not configured.');
        }

        try {
            return JWT::decode($token, new Key($secret, 'HS256'));
        } catch (ExpiredException $e) {
            throw new \RuntimeException('Token has expired.');
        } catch (SignatureInvalidException $e) {
            throw new \RuntimeException('Token signature is invalid.');
        } catch (\Exception $e) {
            throw new \RuntimeException('Invalid token.');
        }
    }
}
