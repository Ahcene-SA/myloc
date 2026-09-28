<?php

declare(strict_types=1);

namespace Myloc\Services;

use Myloc\Config\Database;
use Myloc\Models\Promo;
use Myloc\Models\Setting;
use PDO;

/**
 * Calcul du prix d'une location avec les remises MYLOC.DZ.
 *
 * Remises possibles (non cumulables, la plus avantageuse s'applique) :
 *  - durée : ex. -10 % dès 7 jours, -20 % dès 30 jours ;
 *  - fidélité : ex. -5 % à partir de 3 locations terminées ;
 *  - code promo saisi par le client.
 */
class Pricing
{
    public const RULES_KEY = 'pricing_rules';

    public const DEFAULT_RULES = [
        'duration' => [
            ['min_days' => 7, 'percent' => 10],
            ['min_days' => 30, 'percent' => 20],
        ],
        'loyalty' => ['enabled' => true, 'min_rentals' => 3, 'percent' => 5],
    ];

    private PDO $pdo;
    private Setting $settings;
    private Promo $promos;

    public function __construct(Database $db)
    {
        $this->pdo = $db->getPdo();
        $this->settings = new Setting($db);
        $this->promos = new Promo($db);
    }

    public function rules(): array
    {
        $rules = $this->settings->get(self::RULES_KEY, self::DEFAULT_RULES);
        return [
            'duration' => array_values($rules['duration'] ?? []),
            'loyalty' => ($rules['loyalty'] ?? []) + self::DEFAULT_RULES['loyalty'],
        ];
    }

    public function saveRules(array $rules): void
    {
        $this->settings->set(self::RULES_KEY, $rules);
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

    /** Nombre de locations confirmées déjà terminées pour ce client. */
    public function completedRentals(int $userId): int
    {
        $stmt = $this->pdo->prepare("SELECT COUNT(*) FROM reservations
            WHERE user_id = :id AND status = 'confirmed' AND end_date < CURDATE()");
        $stmt->execute([':id' => $userId]);
        return (int) $stmt->fetchColumn();
    }

    /**
     * @return array{days:int, price_per_day:float, base_price:float, discount_amount:float, total_price:float,
     *               discount_label:?string, discount_source:?string, promo_code:?string,
     *               promo:?array{valid:bool, message:string}, loyalty:?array{rentals:int, needed:int, percent:float}}
     */
    public function quote(float $pricePerDay, int $days, ?int $userId = null, ?string $promoCode = null): array
    {
        $base = round($pricePerDay * $days, 2);
        $rules = $this->rules();
        $candidates = [];

        // Durée : la meilleure tranche atteinte
        $bestDuration = null;
        foreach ($rules['duration'] as $tier) {
            $min = (int) ($tier['min_days'] ?? 0);
            $pct = (float) ($tier['percent'] ?? 0);
            if ($min > 0 && $pct > 0 && $days >= $min && (!$bestDuration || $pct > $bestDuration['percent'])) {
                $bestDuration = ['percent' => $pct, 'min_days' => $min];
            }
        }
        if ($bestDuration) {
            $candidates[] = [
                'amount' => round($base * $bestDuration['percent'] / 100, 2),
                'label' => sprintf('Remise durée -%s %% (dès %d jours)', $this->num($bestDuration['percent']), $bestDuration['min_days']),
                'source' => 'duration',
            ];
        }

        // Fidélité
        $loyaltyInfo = null;
        $loyalty = $rules['loyalty'];
        if ($userId && !empty($loyalty['enabled']) && (float) $loyalty['percent'] > 0) {
            $done = $this->completedRentals($userId);
            $needed = max(1, (int) $loyalty['min_rentals']);
            $loyaltyInfo = ['rentals' => $done, 'needed' => $needed, 'percent' => (float) $loyalty['percent']];
            if ($done >= $needed) {
                $candidates[] = [
                    'amount' => round($base * (float) $loyalty['percent'] / 100, 2),
                    'label' => sprintf('Remise fidélité -%s %%', $this->num((float) $loyalty['percent'])),
                    'source' => 'loyalty',
                ];
            }
        }

        // Code promo
        $promoResult = null;
        $code = $promoCode !== null ? strtoupper(trim($promoCode)) : '';
        if ($code !== '') {
            [$ok, $message, $amount, $label] = $this->checkPromo($code, $base, $days);
            $promoResult = ['valid' => $ok, 'message' => $message];
            if ($ok) {
                $candidates[] = ['amount' => $amount, 'label' => $label, 'source' => 'promo'];
            }
        }

        $best = null;
        foreach ($candidates as $c) {
            if (!$best || $c['amount'] > $best['amount']) {
                $best = $c;
            }
        }
        if ($promoResult && $promoResult['valid'] && $best && $best['source'] !== 'promo') {
            $promoResult['message'] = 'Code valide, mais votre remise actuelle est plus avantageuse (remises non cumulables).';
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
            'promo_code' => ($best['source'] ?? null) === 'promo' ? $code : null,
            'promo' => $promoResult,
            'loyalty' => $loyaltyInfo,
        ];
    }

    /** @return array{0:bool,1:string,2:float,3:string} */
    private function checkPromo(string $code, float $base, int $days): array
    {
        $p = $this->promos->findByCode($code);
        $today = date('Y-m-d');
        if (!$p || !(int) $p['active']) {
            return [false, 'Ce code promo n\'existe pas ou n\'est plus actif.', 0.0, ''];
        }
        if ($p['valid_from'] && $today < $p['valid_from']) {
            return [false, 'Ce code sera valable à partir du ' . date('d/m/Y', strtotime($p['valid_from'])) . '.', 0.0, ''];
        }
        if ($p['valid_until'] && $today > $p['valid_until']) {
            return [false, 'Ce code a expiré.', 0.0, ''];
        }
        if ($p['max_uses'] !== null && (int) $p['uses'] >= (int) $p['max_uses']) {
            return [false, 'Ce code a déjà été utilisé le nombre maximum de fois.', 0.0, ''];
        }
        if ($p['min_days'] !== null && $days < (int) $p['min_days']) {
            return [false, 'Ce code est valable à partir de ' . (int) $p['min_days'] . ' jours de location.', 0.0, ''];
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
