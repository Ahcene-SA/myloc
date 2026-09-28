<?php

declare(strict_types=1);

namespace Myloc\Utils;

/**
 * Codes à 6 chiffres (TOTP, RFC 6238) compatibles Google Authenticator / Microsoft Authenticator.
 * Aucun service externe : le secret est partagé une fois via le QR code, puis le téléphone
 * et le serveur calculent le même code toutes les 30 secondes.
 */
class Totp
{
    private const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

    public static function generateSecret(): string
    {
        return self::base32Encode(random_bytes(20));
    }

    public static function uri(string $secret, string $account, string $issuer = 'MYLOC.DZ'): string
    {
        return sprintf(
            'otpauth://totp/%s:%s?secret=%s&issuer=%s&algorithm=SHA1&digits=6&period=30',
            rawurlencode($issuer),
            rawurlencode($account),
            $secret,
            rawurlencode($issuer)
        );
    }

    public static function code(string $secret, ?int $timeSlice = null): string
    {
        $timeSlice ??= intdiv(time(), 30);
        $key = self::base32Decode($secret);
        $binaryTime = pack('N*', 0) . pack('N*', $timeSlice);
        $hash = hash_hmac('sha1', $binaryTime, $key, true);
        $offset = ord($hash[19]) & 0x0f;
        $value = ((ord($hash[$offset]) & 0x7f) << 24)
            | ((ord($hash[$offset + 1]) & 0xff) << 16)
            | ((ord($hash[$offset + 2]) & 0xff) << 8)
            | (ord($hash[$offset + 3]) & 0xff);
        return str_pad((string) ($value % 1000000), 6, '0', STR_PAD_LEFT);
    }

    /**
     * Vérifie un code en tolérant ±30 s de décalage d'horloge du téléphone.
     * Renvoie la tranche de 30 s correspondant au code (à mémoriser pour refuser qu'il
     * soit rejoué), ou null si le code est faux.
     *
     * @param int|null $lastSlice dernière tranche déjà utilisée : ce code et les plus anciens sont refusés
     */
    public static function verifySlice(string $secret, string $code, ?int $lastSlice = null): ?int
    {
        $code = preg_replace('/\D/', '', $code) ?? '';
        if (strlen($code) !== 6) {
            return null;
        }
        $slice = intdiv(time(), 30);
        for ($i = -1; $i <= 1; $i++) {
            $candidate = $slice + $i;
            if ($lastSlice !== null && $candidate <= $lastSlice) {
                continue;
            }
            if (hash_equals(self::code($secret, $candidate), $code)) {
                return $candidate;
            }
        }
        return null;
    }

    /** Variante oui / non (sans protection contre la réutilisation : préférer verifySlice). */
    public static function verify(string $secret, string $code): bool
    {
        return self::verifySlice($secret, $code) !== null;
    }

    /** 8 codes de secours à usage unique : [en clair pour l'affichage, hachés pour la base]. */
    public static function recoveryCodes(int $count = 8): array
    {
        $plain = [];
        $hashed = [];
        for ($i = 0; $i < $count; $i++) {
            $c = strtoupper(bin2hex(random_bytes(2)) . '-' . bin2hex(random_bytes(2)));
            $plain[] = $c;
            $hashed[] = password_hash($c, PASSWORD_BCRYPT);
        }
        return [$plain, $hashed];
    }

    private static function base32Encode(string $data): string
    {
        $bits = '';
        foreach (str_split($data) as $c) {
            $bits .= str_pad(decbin(ord($c)), 8, '0', STR_PAD_LEFT);
        }
        $out = '';
        foreach (str_split($bits, 5) as $chunk) {
            $out .= self::ALPHABET[bindec(str_pad($chunk, 5, '0'))];
        }
        return $out;
    }

    private static function base32Decode(string $b32): string
    {
        $b32 = strtoupper(preg_replace('/[^A-Za-z2-7]/', '', $b32) ?? '');
        $bits = '';
        foreach (str_split($b32) as $c) {
            $bits .= str_pad(decbin(strpos(self::ALPHABET, $c)), 5, '0', STR_PAD_LEFT);
        }
        $out = '';
        foreach (str_split($bits, 8) as $byte) {
            if (strlen($byte) === 8) {
                $out .= chr(bindec($byte));
            }
        }
        return $out;
    }
}
