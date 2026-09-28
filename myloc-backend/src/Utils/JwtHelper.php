<?php

declare(strict_types=1);

namespace Myloc\Utils;

use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Firebase\JWT\ExpiredException;
use Firebase\JWT\SignatureInvalidException;

class JwtHelper
{
    /**
     * @param array<string, mixed> $claims claims supplémentaires (scope, tv…)
     * @param int|null $ttl durée de validité en secondes (par défaut JWT_EXPIRY)
     */
    public static function encode(int $userId, string $role, array $claims = [], ?int $ttl = null): string
    {
        $secret = $_ENV['JWT_SECRET'] ?? '';
        if ($secret === '') {
            throw new \RuntimeException('JWT secret is not configured.');
        }

        $expiry = $ttl ?? (int) ($_ENV['JWT_EXPIRY'] ?? 86400);
        $issuedAt = time();

        $payload = array_merge($claims, [
            'iat' => $issuedAt,
            'exp' => $issuedAt + $expiry,
            'sub' => $userId,
            'role' => $role,
        ]);

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
