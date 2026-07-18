<?php

declare(strict_types=1);

namespace Myloc\Utils;

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

    public static function email(string $email): bool
    {
        return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
    }

    public static function stringLength(string $value, int $min, ?int $max = null): bool
    {
        $len = mb_strlen($value);
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

    public static function date(string $date): bool
    {
        return \DateTimeImmutable::createFromFormat('Y-m-d', $date) !== false;
    }

    public static function sanitizeString(?string $value): string
    {
        if ($value === null) {
            return '';
        }
        return trim(strip_tags($value));
    }
}
