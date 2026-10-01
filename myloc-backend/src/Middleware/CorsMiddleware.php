<?php

declare(strict_types=1);

namespace Myloc\Middleware;

/**
 * CORS : liste blanche ALLOWED_ORIGINS (origines séparées par des virgules, sans espaces).
 * - Origine dans la liste : elle est écho exactement + « Vary: Origin » (cache des proxys).
 * - Liste vide (développement local) : « * », comme avant.
 * - Origine hors liste : aucun en-tête CORS — le navigateur refuse la requête, un site
 *   tiers ne peut pas piloter l'API depuis le navigateur d'un visiteur.
 * Le site principal n'a pas besoin de CORS du tout (même origine via le proxy Nginx).
 */
class CorsMiddleware
{
    public static function apply(): void
    {
        $allowed = self::allowedOrigins();
        $origin = trim((string) ($_SERVER['HTTP_ORIGIN'] ?? ''));
        if ($origin === '') {
            header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
            header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
            header('Access-Control-Max-Age: 86400');
        } elseif (in_array($origin, $allowed, true)) {
            header('Access-Control-Allow-Origin: ' . $origin);
            header('Vary: Origin');
            header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
            header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
            header('Access-Control-Max-Age: 86400');
        } elseif ($allowed === []) {
            header('Access-Control-Allow-Origin: *');
            header('Vary: Origin');
            header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
            header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
            header('Access-Control-Max-Age: 86400');
        }

        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            http_response_code(204);
            exit;
        }
    }

    /** @return string[] origines autorisées ; liste vide = tout autoriser (développement). */
    private static function allowedOrigins(): array
    {
        $raw = trim((string) ($_ENV['ALLOWED_ORIGINS'] ?? ''));
        if ($raw === '') {
            return [];
        }
        $origins = [];
        foreach (explode(',', str_replace(' ', '', $raw)) as $o) {
            if ($o !== '' && preg_match('#^https?://[a-z0-9.\-]+(:[0-9]+)?$#i', $o)) {
                $origins[] = $o;
            }
        }
        return array_unique($origins);
    }
}