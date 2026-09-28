<?php

declare(strict_types=1);

namespace Myloc\Utils;

/**
 * Adresse IP du visiteur.
 * Par défaut REMOTE_ADDR. Si l'API est derrière un proxy local (Nginx, Cloudflare Tunnel…)
 * et que TRUST_PROXY=1 dans .env, on lit l'en-tête transmis par ce proxy — uniquement quand
 * la connexion vient de la machine elle-même (127.0.0.1 / ::1), sinon l'en-tête serait falsifiable.
 */
class ClientIp
{
    public static function get(): string
    {
        $remote = (string) ($_SERVER['REMOTE_ADDR'] ?? '');
        $trust = in_array(strtolower((string) ($_ENV['TRUST_PROXY'] ?? '')), ['1', 'true', 'yes', 'on'], true);
        if (!$trust || !in_array($remote, ['127.0.0.1', '::1'], true)) {
            return $remote;
        }

        $cf = trim((string) ($_SERVER['HTTP_CF_CONNECTING_IP'] ?? ''));
        if ($cf !== '' && filter_var($cf, FILTER_VALIDATE_IP)) {
            return $cf;
        }
        $xff = (string) ($_SERVER['HTTP_X_FORWARDED_FOR'] ?? '');
        if ($xff !== '') {
            $first = trim(explode(',', $xff)[0]);
            if (filter_var($first, FILTER_VALIDATE_IP)) {
                return $first;
            }
        }
        return $remote;
    }
}
