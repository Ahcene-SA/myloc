<?php

declare(strict_types=1);

namespace Myloc\Controllers;

use Myloc\Config\Database;
use Myloc\Middleware\AuthMiddleware;
use Myloc\Models\Car;
use Myloc\Models\Promo;
use Myloc\Services\Pricing;
use Myloc\Utils\Response;
use Myloc\Utils\Validator;

class PricingController
{
    private Pricing $pricing;
    private Promo $promos;
    private Car $cars;

    public function __construct(Database $db)
    {
        $this->pricing = new Pricing($db);
        $this->promos = new Promo($db);
        $this->cars = new Car($db);
    }

    /** Devis : prix, remise appliquée et vérification d'un code promo (visiteur ou client connecté). */
    public function quote(): void
    {
        $input = $this->json();
        $carId = filter_var($input['car_id'] ?? null, FILTER_VALIDATE_INT);
        $start = (string) ($input['start_date'] ?? '');
        $end = (string) ($input['end_date'] ?? '');
        if (!$carId || !Validator::date($start) || !Validator::date($end)) {
            Response::error('Véhicule ou dates manquants.', 422);
        }
        $car = $this->cars->findById($carId, true);
        if (!$car) {
            Response::error('Véhicule introuvable.', 404);
        }
        $days = (int) (new \DateTimeImmutable($start))->diff(new \DateTimeImmutable($end))->days;
        if ($end <= $start || $days < 1) {
            Response::error('La date de retour doit être après la date de départ.', 422);
        }
        $user = AuthMiddleware::optionalUser();
        $userId = $user && $user['role'] === 'client' ? $user['user_id'] : null;
        $code = isset($input['promo_code']) ? Validator::sanitizeString((string) $input['promo_code']) : null;

        Response::success('Devis calculé.', ['quote' => $this->pricing->quote((float) $car['price_per_day'], $days, $userId, $code)]);
    }

    /** Public : règles actuelles (pour afficher « -10 % dès 7 jours » sur le site). */
    public function publicRules(): void
    {
        $rules = $this->pricing->rules();
        Response::success('Règles.', ['rules' => $rules]);
    }

    public function updateRules(): void
    {
        $input = $this->json();
        $duration = [];
        foreach ((array) ($input['duration'] ?? []) as $tier) {
            $min = filter_var($tier['min_days'] ?? null, FILTER_VALIDATE_INT);
            $pct = filter_var($tier['percent'] ?? null, FILTER_VALIDATE_FLOAT);
            if ($min === false || $min < 1 || $pct === false || $pct <= 0 || $pct > 90) {
                Response::error('Remise durée invalide : nombre de jours ≥ 1 et pourcentage entre 1 et 90.', 422);
            }
            $duration[] = ['min_days' => $min, 'percent' => round((float) $pct, 2)];
        }
        usort($duration, fn($a, $b) => $a['min_days'] <=> $b['min_days']);

        $l = (array) ($input['loyalty'] ?? []);
        $min = filter_var($l['min_rentals'] ?? 3, FILTER_VALIDATE_INT);
        $pct = filter_var($l['percent'] ?? 0, FILTER_VALIDATE_FLOAT);
        if ($min === false || $min < 1 || $pct === false || $pct < 0 || $pct > 90) {
            Response::error('Remise fidélité invalide.', 422);
        }
        $rules = [
            'duration' => $duration,
            'loyalty' => ['enabled' => !empty($l['enabled']), 'min_rentals' => $min, 'percent' => round((float) $pct, 2)],
        ];
        $this->pricing->saveRules($rules);
        Response::success('Règles de remise enregistrées.', ['rules' => $rules]);
    }

    public function listPromos(): void
    {
        Response::success('Codes promo.', ['promos' => $this->promos->findAll()]);
    }

    public function createPromo(): void
    {
        $data = $this->validatePromo($this->json());
        if ($this->promos->findByCode($data['code'])) {
            Response::error('Ce code existe déjà.', 409);
        }
        $id = $this->promos->create($data);
        Response::success('Code promo créé.', ['promo' => $this->promos->findById($id)], 201);
    }

    public function updatePromo(array $params): void
    {
        $id = (int) $params['id'];
        $existing = $this->promos->findById($id);
        if (!$existing) {
            Response::error('Code introuvable.', 404);
        }
        $data = $this->validatePromo($this->json() + $existing);
        $other = $this->promos->findByCode($data['code']);
        if ($other && (int) $other['id'] !== $id) {
            Response::error('Ce code existe déjà.', 409);
        }
        $this->promos->update($id, $data);
        Response::success('Code promo mis à jour.', ['promo' => $this->promos->findById($id)]);
    }

    public function deletePromo(array $params): void
    {
        $this->promos->delete((int) $params['id']);
        Response::success('Code promo supprimé.');
    }

    private function validatePromo(array $in): array
    {
        $code = strtoupper(preg_replace('/\s+/', '', (string) ($in['code'] ?? '')));
        if (!preg_match('/^[A-Z0-9_-]{3,40}$/', $code)) {
            Response::error('Le code doit faire 3 à 40 caractères (lettres, chiffres, - ou _).', 422);
        }
        $type = ($in['discount_type'] ?? 'percent') === 'fixed' ? 'fixed' : 'percent';
        $value = filter_var($in['discount_value'] ?? null, FILTER_VALIDATE_FLOAT);
        if ($value === false || $value <= 0 || ($type === 'percent' && $value > 90)) {
            Response::error($type === 'percent' ? 'Pourcentage entre 1 et 90.' : 'Montant de remise invalide.', 422);
        }
        $optInt = function ($v, string $label) {
            if ($v === null || $v === '') {
                return null;
            }
            $n = filter_var($v, FILTER_VALIDATE_INT);
            if ($n === false || $n < 1) {
                Response::error("{$label} invalide.", 422);
            }
            return $n;
        };
        $optDate = function ($v) {
            if ($v === null || $v === '') {
                return null;
            }
            if (!Validator::date((string) $v)) {
                Response::error('Date invalide.', 422);
            }
            return (string) $v;
        };
        $from = $optDate($in['valid_from'] ?? null);
        $until = $optDate($in['valid_until'] ?? null);
        if ($from && $until && $until < $from) {
            Response::error('La date de fin doit être après la date de début.', 422);
        }
        $desc = Validator::sanitizeString((string) ($in['description'] ?? ''));
        return [
            'code' => $code,
            'description' => $desc !== '' ? mb_substr($desc, 0, 160) : null,
            'discount_type' => $type,
            'discount_value' => round((float) $value, 2),
            'min_days' => $optInt($in['min_days'] ?? null, 'Durée minimale'),
            'valid_from' => $from,
            'valid_until' => $until,
            'max_uses' => $optInt($in['max_uses'] ?? null, 'Nombre d\'utilisations'),
            'active' => !isset($in['active']) || !empty($in['active']),
        ];
    }

    private function json(): array
    {
        $data = json_decode((string) file_get_contents('php://input'), true);
        return is_array($data) ? $data : [];
    }
}
