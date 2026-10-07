<?php

declare(strict_types=1);

namespace Myloc\Services;

use Myloc\Config\Database;
use Myloc\Models\Promo;

/**
 * Calcul du prix d'une location MYLOC.DZ.
 *
 * Pas de remise automatique (durée, fidélité) : la seule remise applicable est
 * un code promo créé et choisi par l'agence, saisi par le client.
 */
class Pricing
{
    private Promo $promos;

    public function __construct(Database $db)
    {
        $this->promos = new Promo($db);
    }

    /** Compte une utilisation du code ; false si sa limite (max_uses) est déjà atteinte. */
    public function usePromo(string $code): bool
    {
        return $this->promos->incrementUses($code);
    }

    /** Une réservation refusée / annulée rend son utilisation du code promo. */
    public function releasePromo(?string $code): void
    {
        if ($code !== null && $code !== '') {
            $this->promos->decrementUses($code);
        }
    }

    /** Réservation réactivée par l'agence : le code compte de nouveau. */
    public function reclaimPromo(?string $code): void
    {
        if ($code !== null && $code !== '') {
            $this->promos->forceIncrementUses($code);
        }
    }

    /**
     * @return array{days:int, price_per_day:float, base_price:float, discount_amount:float, total_price:float,
     *               discount_label:?string, discount_source:?string, promo_code:?string,
     *               promo:array{valid:bool, message:string}|null}
     */
    public function quote(float $pricePerDay, int $days, ?int $userId = null, ?string $promoCode = null): array
    {
        $base = round($pricePerDay * $days, 2);

        // Seule remise possible : un code promo créé par l'agence.
        $promoResult = null;
        $code = $promoCode !== null ? strtoupper(trim($promoCode)) : '';
        $best = null;
        if ($code !== '') {
            [$ok, $message, $amount, $label] = $this->checkPromo($code, $base, $days);
            $promoResult = ['valid' => $ok, 'message' => $message];
            if ($ok) {
                $best = ['amount' => $amount, 'label' => $label, 'source' => 'promo'];
            }
        }

        $discount = $best ? min($base, $best['amount']) : 0.0;
        return [
            'days' => $days,
            'price_per_day' => $pricePerDay,
            'base_price' => $base,
            'discount_amount' => $discount,
            'total_price' => round($base - $discount, 2),
            'discount_label' => $best['label'] ?? null,
            'discount_source' => $best['source'] ?? null,
            'promo_code' => $best ? $code : null,
            'promo' => $promoResult,
        ];
    }

    /** @return array{0:bool,1:string,2:float,3:string} */
    private function checkPromo(string $code, float $base, int $days): array
    {
        $p = $this->promos->findByCode($code);
        $today = date('Y-m-d');
        // Tous les états « inapplicable » (inexistant, désactivé, à venir, expiré, épuisé,
        // durée minimale) donnent le même message : impossible de sonder l'état d'un code.
        if (!$p
            || !(int) $p['active']
            || ($p['valid_from'] && $today < $p['valid_from'])
            || ($p['valid_until'] && $today > $p['valid_until'])
            || ($p['max_uses'] !== null && (int) $p['uses'] >= (int) $p['max_uses'])
            || ($p['min_days'] !== null && $days < (int) $p['min_days'])
        ) {
            return [false, 'Code promo invalide ou non applicable.', 0.0, ''];
        }
        $value = (float) $p['discount_value'];
        if ($p['discount_type'] === 'percent') {
            $amount = round($base * min(100, $value) / 100, 2);
            $label = sprintf('Code %s -%s %%', $p['code'], $this->num($value));
        } else {
            $amount = min($base, round($value, 2));
            $label = sprintf('Code %s (remise fixe)', $p['code']);
        }
        return [true, 'Code appliqué.', $amount, $label];
    }

    private function num(float $v): string
    {
        return rtrim(rtrim(number_format($v, 2, ',', ''), '0'), ',');
    }
}
