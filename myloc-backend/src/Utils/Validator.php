<?php

declare(strict_types=1);

namespace Myloc\Utils;

/**
 * Contrôles des saisies. Les entrées JSON peuvent avoir n'importe quel type
 * (tableau, nombre, null…) : tout ce qui n'est pas un scalaire est traité comme une chaîne vide
 * pour renvoyer une erreur 422 propre au lieu d'une TypeError (500).
 */
class Validator
{
    public static function required(array $data, array $fields): array
    {
        $missing = [];
        foreach ($fields as $field) {
            if (!isset($data[$field]) || $data[$field] === '' || $data[$field] === null) {
                $missing[] = $field;
            }
        }
        return $missing;
    }

    /** Valeur quelconque → chaîne (les tableaux / objets deviennent ''). */
    public static function str(mixed $value): string
    {
        if (is_string($value)) {
            return $value;
        }
        if (is_int($value) || is_float($value)) {
            return (string) $value;
        }
        if (is_bool($value)) {
            return $value ? '1' : '';
        }
        return '';
    }

    public static function email(mixed $email): bool
    {
        return filter_var(self::str($email), FILTER_VALIDATE_EMAIL) !== false;
    }

    public static function stringLength(mixed $value, int $min, ?int $max = null): bool
    {
        $len = mb_strlen(self::str($value));
        if ($len < $min) {
            return false;
        }
        if ($max !== null && $len > $max) {
            return false;
        }
        return true;
    }

    public static function inArray($value, array $allowed): bool
    {
        return in_array($value, $allowed, true);
    }

    /** Date AAAA-MM-JJ réelle (refuse 2027-02-30, que PHP « corrigerait » en 2 mars). */
    public static function date(mixed $date): bool
    {
        $input = self::str($date);
        $d = \DateTimeImmutable::createFromFormat('!Y-m-d', $input);
        return $d !== false && $d->format('Y-m-d') === $input;
    }

    public static function sanitizeString(mixed $value): string
    {
        return trim(strip_tags(self::str($value)));
    }
}
