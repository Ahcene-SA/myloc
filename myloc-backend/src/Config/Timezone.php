<?php

declare(strict_types=1);

namespace Myloc\Config;

/**
 * Fuseau horaire de l'application (APP_TIMEZONE dans .env, Africa/Algiers par défaut).
 * À appeler juste après le chargement de .env, avant toute date ou connexion MySQL :
 * PHP et MySQL (voir Database) utilisent alors la même heure pour « aujourd'hui », NOW(), CURDATE().
 */
class Timezone
{
    public const DEFAULT = 'Africa/Algiers';

    public static function apply(): string
    {
        $tz = trim((string) ($_ENV['APP_TIMEZONE'] ?? ''));
        if ($tz === '' || !in_array($tz, \DateTimeZone::listIdentifiers(), true)) {
            $tz = self::DEFAULT;
        }
        date_default_timezone_set($tz);
        return $tz;
    }

    /** Décalage actuel (ex. « +01:00 »), compris par MySQL même sans les tables de fuseaux nommés. */
    public static function mysqlOffset(): string
    {
        return (new \DateTimeImmutable('now'))->format('P');
    }
}
