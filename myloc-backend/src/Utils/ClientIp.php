<?php

declare(strict_types=1);

namespace Myloc\Utils;

/**
 * Adresse IP du visiteur.
 * Par défaut REMOTE_ADDR. TRUST_PROXY=1 signifie « la connexion directe vient de notre
 * proxy de confiance » (le Nginx frontal de la stack compose, sur le réseau privé Docker) :
 * on lit l'IP réelle qu'il transmet. Nginx réécrit X-Forwarded-For en une seule valeur
 * (connexion réelle après Traefik, voir nginx-frontend.conf) — prioritaire : un visiteur ne
 * peut rien y injecter. CF-Connecting-IP n'est lu que si X-Forwarded-For est absent
 * (site un jour derrière Cloudflare) ; il est falsifiable si l'API est atteinte hors proxy.
 * TRUST_PROXY=0 (développement, tunnels) : les en-têtes seraient falsifiables.
 */
class ClientIp
{
    public static function get(): string
    {
        $remote = (string) ($_SERVER['REMOTE_ADDR'] ?? '');
        $trust = in_array(strtolower((string) ($_ENV['TRUST_PROXY'] ?? '')), ['1', 'true', 'yes', 'on'], true);
        if (!$trust) {
            return $remote;
        }

        // Entrée la plus à droite : ajoutée par le proxy de confiance (la gauche est
        // falsifiable par le visiteur lui-même).
        $xff = (string) ($_SERVER['HTTP_X_FORWARDED_FOR'] ?? '');
        if ($xff !== '') {
            $entries = explode(',', $xff);
            for ($i = count($entries) - 1; $i >= 0; $i--) {
                $candidate = trim($entries[$i]);
                if ($candidate !== '' && filter_var($candidate, FILTER_VALIDATE_IP)) {
                    return $candidate;
                }
            }
        }
        $cf = trim((string) ($_SERVER['HTTP_CF_CONNECTING_IP'] ?? ''));
        if ($cf !== '' && filter_var($cf, FILTER_VALIDATE_IP)) {
            return $cf;
        }
        return $remote;
    }
}
