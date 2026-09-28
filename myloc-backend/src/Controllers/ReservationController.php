<?php

declare(strict_types=1);

namespace Myloc\Controllers;

use Myloc\Config\Database;
use Myloc\Middleware\AuthMiddleware;
use Myloc\Models\Car;
use Myloc\Models\Reservation;
use Myloc\Models\User;
use Myloc\Services\Emails;
use Myloc\Services\Pricing;
use Myloc\Utils\Audit;
use Myloc\Utils\Response;
use Myloc\Utils\Validator;

class ReservationController
{
    private const MAX_DAYS = 90;
    private const PAYMENT_METHODS = ['especes', 'carte', 'virement'];
    /** Demandes en attente simultanées par client (évite de bloquer toute la flotte). */
    private const MAX_PENDING_PER_CLIENT = 3;
    /** Réservation en ligne : départ au plus tard dans 12 mois. */
    private const MAX_MONTHS_AHEAD = 12;
    /** Remise maximale qu'un employé peut accorder sous le tarif calculé (au-delà : le propriétaire). */
    public const EMPLOYEE_MAX_DISCOUNT_PERCENT = 20;
    /** Plus grand montant accepté par une colonne DECIMAL(10, 2). */
    private const MAX_AMOUNT = 99999999.99;

    private Reservation $reservationModel;
    private Car $carModel;
    private User $userModel;
    private Pricing $pricing;
    private \PDO $pdo;

    public function __construct(Database $db)
    {
        $this->pdo = $db->getPdo();
        $this->pricing = new Pricing($db);
        $this->userModel = new User($db);
        $this->reservationModel = new Reservation($db);
        $this->carModel = new Car($db);
    }

    public function create(): void
    {
        $user = AuthMiddleware::requireClient();
        $input = $this->getJsonInput();

        $required = Validator::required($input, ['car_id', 'start_date', 'end_date', 'full_name', 'email', 'phone']);
        if (!empty($required)) {
            Response::error('Champs obligatoires manquants.', 422, ['missing' => $required]);
        }

        $carId = filter_var($input['car_id'], FILTER_VALIDATE_INT);
        if ($carId === false || $carId <= 0) {
            Response::error('Véhicule invalide.', 422);
        }

        $startDate = Validator::sanitizeString($input['start_date']);
        $endDate = Validator::sanitizeString($input['end_date']);
        if (!Validator::date($startDate) || !Validator::date($endDate)) {
            Response::error('Les dates doivent être au format AAAA-MM-JJ.', 422);
        }

        $start = \DateTimeImmutable::createFromFormat('!Y-m-d', $startDate);
        $end = \DateTimeImmutable::createFromFormat('!Y-m-d', $endDate);
        $today = new \DateTimeImmutable('today');
        if ($start < $today) {
            Response::error('La date de départ ne peut pas être dans le passé.', 422);
        }
        if ($end <= $start) {
            Response::error('La date de retour doit être après la date de départ.', 422);
        }
        if ($start > $today->modify('+' . self::MAX_MONTHS_AHEAD . ' months')) {
            Response::error('Les réservations en ligne sont ouvertes jusqu\'à ' . self::MAX_MONTHS_AHEAD . ' mois à l\'avance. Contactez-nous pour une date plus lointaine.', 422);
        }
        $days = (int) $start->diff($end)->days;
        if ($days > self::MAX_DAYS) {
            Response::error('La durée maximale d\'une location en ligne est de ' . self::MAX_DAYS . ' jours. Contactez-nous pour une location longue durée.', 422);
        }

        $fullName = Validator::sanitizeString($input['full_name']);
        $email = strtolower(Validator::sanitizeString($input['email']));
        $phone = Validator::sanitizeString($input['phone']);
        if (!Validator::email($email)) {
            Response::error('Adresse email invalide.', 422);
        }
        if (!Validator::stringLength($fullName, 2, 100)) {
            Response::error('Le nom doit contenir entre 2 et 100 caractères.', 422);
        }
        if (!Validator::stringLength($phone, 5, 20)) {
            Response::error('Le téléphone doit contenir entre 5 et 20 caractères.', 422);
        }

        $details = $this->readDetails($input);

        $car = $this->carModel->findById($carId);
        if (!$car) {
            Response::error('Ce véhicule n\'est pas disponible.', 404);
        }

        $promoCode = isset($input['promo_code']) ? Validator::sanitizeString($input['promo_code']) : '';

        // Vérification des disponibilités + enregistrement d'un seul bloc : la ligne de la voiture
        // est verrouillée, deux demandes simultanées sur les mêmes dates ne passent pas toutes les deux.
        $this->pdo->beginTransaction();
        try {
            // Un client à la fois : le plafond de demandes en attente ne peut pas être contourné en parallèle
            $this->pdo->prepare('SELECT id FROM users WHERE id = ? FOR UPDATE')->execute([$user['user_id']]);
            if ($this->countActivePending((int) $user['user_id']) >= self::MAX_PENDING_PER_CLIENT) {
                $this->fail('Vous avez déjà ' . self::MAX_PENDING_PER_CLIENT . ' demandes en attente. Attendez la réponse de l\'agence ou annulez-en une avant d\'en faire une nouvelle.', 422);
            }
            $this->lockCar($carId);
            if ($this->reservationModel->hasOverlap($carId, $startDate, $endDate)) {
                $this->fail('Ce véhicule est déjà réservé sur ces dates. Choisissez d\'autres dates ou un autre véhicule.', 409);
            }

            $quote = $this->pricing->quote((float) $car['price_per_day'], $days, (int) $user['user_id'], $promoCode !== '' ? $promoCode : null);
            if ($promoCode !== '' && $quote['promo'] && !$quote['promo']['valid']) {
                $this->fail($quote['promo']['message'], 422);
            }
            if ($quote['base_price'] > self::MAX_AMOUNT) {
                $this->fail('Montant trop élevé : contactez l\'agence.', 422);
            }
            $totalPrice = $quote['total_price'];

            $reservationId = $this->reservationModel->create(
                (int) $user['user_id'],
                $carId,
                $startDate,
                $endDate,
                $fullName,
                $email,
                $phone,
                $totalPrice,
                $details,
                ['pricing' => $quote]
            );
            if ($quote['promo_code'] && !$this->pricing->usePromo($quote['promo_code'])) {
                $this->fail('Ce code a déjà été utilisé le nombre maximum de fois.', 422);
            }
            $this->pdo->commit();
        } catch (\Throwable $e) {
            $this->rollBack();
            throw $e;
        }

        $reservation = $this->reservationModel->findById($reservationId);

        // Alerte à l'agence + accusé de réception au client (un échec d'envoi ne bloque pas)
        $detailed = $this->reservationModel->findDetailedById($reservationId);
        if ($detailed) {
            Emails::newReservation($detailed);
        }

        Response::success('Réservation envoyée.', [
            'reservation' => $reservation,
            'total_price' => $totalPrice,
            'days' => $days,
            'quote' => $quote,
        ], 201);
    }

    public function myReservations(): void
    {
        $user = AuthMiddleware::requireClient();
        $reservations = $this->reservationModel->findByUserId($user['user_id']);
        Response::success('Réservations récupérées.', ['reservations' => $reservations]);
    }

    /** Le client annule sa propre réservation (en attente ou confirmée, pas encore commencée). */
    public function cancel(array $params): void
    {
        $user = AuthMiddleware::requireClient();
        $id = (int) $params['id'];

        $reservation = $this->reservationModel->findById($id);
        if (!$reservation || (int) $reservation['user_id'] !== $user['user_id']) {
            Response::error('Réservation introuvable.', 404);
        }
        if (!in_array($reservation['status'], ['pending', 'confirmed'], true)) {
            Response::error('Cette réservation ne peut plus être annulée.', 422);
        }
        $start = \DateTimeImmutable::createFromFormat('!Y-m-d', $reservation['start_date']);
        if ($start <= new \DateTimeImmutable('today')) {
            Response::error('La location a déjà commencé : contactez l\'agence pour toute modification.', 422);
        }

        $this->pdo->beginTransaction();
        try {
            // Relecture verrouillée : un double clic n'annule (et ne rend le code promo) qu'une fois
            $current = $this->lockReservation($id);
            if (!in_array($current['status'] ?? '', ['pending', 'confirmed'], true)) {
                $this->fail('Cette réservation ne peut plus être annulée.', 422);
            }
            $this->reservationModel->updateStatus($id, 'cancelled');
            $this->pricing->releasePromo($current['promo_code'] ?? null);
            $this->pdo->commit();
        } catch (\Throwable $e) {
            $this->rollBack();
            throw $e;
        }
        $detailed = $this->reservationModel->findDetailedById($id);
        if ($detailed) {
            Emails::clientCancelled($detailed, $reservation['status']);
        }
        Response::success('Réservation annulée.', ['reservation' => $this->reservationModel->findById($id)]);
    }

    /** Périodes déjà réservées pour une voiture (public, sans données personnelles). */
    public function bookedDates(array $params): void
    {
        $carId = (int) $params['id'];
        Response::success('Disponibilités récupérées.', ['booked' => $this->reservationModel->bookedRanges($carId)]);
    }

    public function allReservations(): void
    {
        AuthMiddleware::requireStaff();
        $reservations = $this->reservationModel->findAll();
        Response::success('Réservations récupérées.', ['reservations' => $reservations]);
    }

    public function updateStatus(array $params): void
    {
        $actor = AuthMiddleware::requireStaff();
        $id = (int) $params['id'];

        $input = $this->getJsonInput();
        $required = Validator::required($input, ['status']);
        if (!empty($required)) {
            Response::error('Statut manquant.', 422);
        }

        $status = Validator::sanitizeString($input['status']);
        if (!Validator::inArray($status, ['pending', 'confirmed', 'rejected', 'cancelled'])) {
            Response::error('Statut invalide.', 422);
        }

        $existing = $this->reservationModel->findById($id);
        if (!$existing) {
            Response::error('Réservation introuvable.', 404);
        }

        $adminNote = null;
        if (array_key_exists('admin_note', $input)) {
            $adminNote = Validator::sanitizeString($input['admin_note'] ?? '');
            if (mb_strlen($adminNote) > 1000) {
                Response::error('Le message est trop long (1000 caractères maximum).', 422);
            }
        }

        // Un employé qui annule une location déjà confirmée doit en donner la raison
        if ($actor['role'] !== 'owner' && $status === 'cancelled' && $existing['status'] === 'confirmed'
            && trim((string) ($adminNote ?? $existing['admin_note'] ?? '')) === '') {
            Response::error('Indiquez le motif de l\'annulation dans le message pour le client.', 422);
        }

        $blocking = ['pending', 'confirmed'];
        $this->pdo->beginTransaction();
        try {
            // Voiture puis réservation verrouillées (même ordre que create) : l'état lu est l'état écrit
            $this->lockCar((int) $existing['car_id']);
            $current = $this->lockReservation($id);
            $wasBlocking = in_array($current['status'], $blocking, true);
            $isBlocking = in_array($status, $blocking, true);

            // Réactiver une réservation refusée/annulée : la voiture doit être encore libre
            if ($isBlocking && !$wasBlocking
                && $this->reservationModel->hasOverlap((int) $current['car_id'], $current['start_date'], $current['end_date'], $id)) {
                $this->fail('Impossible : ce véhicule est déjà réservé sur ces dates par une autre réservation.', 409);
            }

            $this->reservationModel->updateStatus($id, $status, $adminNote);

            // Code promo : rendu si la réservation est refusée / annulée, recompté si elle est réactivée
            if ($wasBlocking && !$isBlocking) {
                $this->pricing->releasePromo($current['promo_code'] ?? null);
            } elseif (!$wasBlocking && $isBlocking) {
                $this->pricing->reclaimPromo($current['promo_code'] ?? null);
            }
            $this->pdo->commit();
        } catch (\Throwable $e) {
            $this->rollBack();
            throw $e;
        }
        $detailed = $this->reservationModel->findDetailedById($id);
        if ($status !== $existing['status'] && $detailed && ($input['notify_client'] ?? true) !== false) {
            Emails::reservationStatus($detailed, $status);
        }
        if ($status !== $existing['status']) {
            Audit::log('reservation_' . $status, 'reservation', $id, [
                'from' => $existing['status'],
                'client' => $existing['full_name'],
                'note' => $adminNote,
            ]);
        } elseif ($adminNote !== null && $adminNote !== (string) $existing['admin_note']) {
            Audit::log('reservation_note', 'reservation', $id, ['client' => $existing['full_name'], 'note' => $adminNote]);
        }
        Response::success('Statut mis à jour.', [
            'admin_note' => $adminNote,
            'reservation' => $detailed,
        ]);
    }

    /**
     * Alertes de l'espace agence : réservations créées après ?since=<id>.
     * Sans « since », renvoie seulement le dernier numéro (point de départ).
     * Requête automatique : ne compte pas comme activité (la session expire toujours après 30 min).
     */
    public function updatesSince(): void
    {
        AuthMiddleware::requireStaffPassive();
        $since = max(0, (int) ($_GET['since'] ?? 0));
        $latest = $this->reservationModel->latestId();
        Response::success('OK', [
            'latest_id' => $latest,
            'pending_count' => $this->reservationModel->countPending(),
            'reservations' => $since > 0 && $latest > $since ? $this->reservationModel->findSince($since) : [],
        ]);
    }

    /**
     * L'agence enregistre elle-même une réservation (prise par WhatsApp, téléphone ou au comptoir).
     * Pas de compte client nécessaire ; le prix peut être négocié.
     */
    public function adminCreate(): void
    {
        $actor = AuthMiddleware::requireStaff();
        $input = $this->getJsonInput();

        $required = Validator::required($input, ['car_id', 'start_date', 'end_date', 'full_name', 'phone']);
        if (!empty($required)) {
            Response::error('Champs obligatoires manquants.', 422, ['missing' => $required]);
        }

        $carId = filter_var($input['car_id'], FILTER_VALIDATE_INT);
        if ($carId === false || $carId <= 0) {
            Response::error('Véhicule invalide.', 422);
        }
        $car = $this->carModel->findById($carId, true);
        if (!$car) {
            Response::error('Véhicule introuvable.', 404);
        }

        $startDate = Validator::sanitizeString($input['start_date']);
        $endDate = Validator::sanitizeString($input['end_date']);
        if (!Validator::date($startDate) || !Validator::date($endDate)) {
            Response::error('Les dates doivent être au format AAAA-MM-JJ.', 422);
        }
        $start = \DateTimeImmutable::createFromFormat('!Y-m-d', $startDate);
        $end = \DateTimeImmutable::createFromFormat('!Y-m-d', $endDate);
        if ($end <= $start) {
            Response::error('La date de retour doit être après la date de départ.', 422);
        }
        $days = (int) $start->diff($end)->days;
        if ($days > 365) {
            Response::error('Durée maximale : 365 jours.', 422);
        }

        $fullName = Validator::sanitizeString($input['full_name']);
        $phone = Validator::sanitizeString($input['phone']);
        $email = strtolower(Validator::sanitizeString($input['email'] ?? ''));
        if (!Validator::stringLength($fullName, 2, 100)) {
            Response::error('Le nom doit contenir entre 2 et 100 caractères.', 422);
        }
        if (!Validator::stringLength($phone, 5, 20)) {
            Response::error('Le téléphone doit contenir entre 5 et 20 caractères.', 422);
        }
        if ($email !== '' && !Validator::email($email)) {
            Response::error('Adresse email invalide.', 422);
        }

        $status = Validator::sanitizeString($input['status'] ?? 'confirmed');
        if (!in_array($status, ['pending', 'confirmed'], true)) {
            Response::error('Statut invalide.', 422);
        }

        // Rattacher à un compte client existant (il la verra dans son espace)
        $userId = null;
        if (!empty($input['user_id'])) {
            $userId = filter_var($input['user_id'], FILTER_VALIDATE_INT);
            $account = $userId ? $this->userModel->findById($userId) : null;
            if (!$account || $account['role'] !== 'client') {
                Response::error('Compte client introuvable.', 422);
            }
        }

        $custom = null;
        if (isset($input['total_price']) && $input['total_price'] !== '' && $input['total_price'] !== null) {
            $custom = filter_var($input['total_price'], FILTER_VALIDATE_FLOAT);
            if ($custom === false || $custom < 0) {
                Response::error('Montant invalide.', 422);
            }
            if ($custom > self::MAX_AMOUNT) {
                Response::error('Montant trop élevé (99 999 999,99 maximum).', 422);
            }
            $custom = round((float) $custom, 2);
        }

        $promoCode = Validator::sanitizeString($input['promo_code'] ?? '');
        $adminNote = Validator::sanitizeString($input['admin_note'] ?? '');
        $details = $this->readDetails($input);

        $this->pdo->beginTransaction();
        try {
            $this->lockCar($carId);
            if ($this->reservationModel->hasOverlap($carId, $startDate, $endDate)) {
                $this->fail('Ce véhicule est déjà réservé sur ces dates.', 409);
            }

            $quote = $this->pricing->quote((float) $car['price_per_day'], $days, $userId ?: null, $promoCode !== '' ? $promoCode : null);
            if ($promoCode !== '' && $quote['promo'] && !$quote['promo']['valid']) {
                $this->fail($quote['promo']['message'], 422);
            }
            if ($custom === null && $quote['base_price'] > self::MAX_AMOUNT) {
                $this->fail('Montant trop élevé : indiquez un prix négocié.', 422);
            }
            if ($custom !== null) {
                // Un employé ne peut pas descendre à plus de 20 % sous le tarif calculé
                $floor = round($quote['total_price'] * (100 - self::EMPLOYEE_MAX_DISCOUNT_PERCENT) / 100, 2);
                if ($actor['role'] !== 'owner' && $custom < $floor) {
                    $this->fail('Remise trop importante : au-delà de ' . self::EMPLOYEE_MAX_DISCOUNT_PERCENT . ' %, demandez au propriétaire.', 422);
                }
                // Prix négocié : la différence avec le tarif est notée comme remise agence
                $quote['base_price'] = min($quote['base_price'], self::MAX_AMOUNT);
                $quote['discount_amount'] = max(0, round($quote['base_price'] - $custom, 2));
                $quote['discount_label'] = $custom < $quote['base_price'] ? 'Prix négocié par l\'agence' : null;
                $quote['promo_code'] = null;
                $quote['total_price'] = $custom;
            }
            $totalPrice = $quote['total_price'];

            $id = $this->reservationModel->create(
                $userId ?: null,
                $carId,
                $startDate,
                $endDate,
                $fullName,
                $email !== '' ? $email : null,
                $phone,
                $totalPrice,
                $details,
                ['status' => $status, 'source' => 'agence', 'admin_note' => $adminNote !== '' ? $adminNote : null, 'pricing' => $quote]
            );
            if ($quote['promo_code'] && !$this->pricing->usePromo($quote['promo_code'])) {
                $this->fail('Ce code a déjà été utilisé le nombre maximum de fois.', 422);
            }
            $this->pdo->commit();
        } catch (\Throwable $e) {
            $this->rollBack();
            throw $e;
        }

        Audit::log('reservation_created', 'reservation', $id, [
            'client' => $fullName,
            'car' => $car['name'],
            'start' => $startDate,
            'end' => $endDate,
            'total' => $totalPrice,
            'status' => $status,
        ]);
        Response::success('Réservation enregistrée.', [
            'reservation' => $this->reservationModel->findDetailedById($id),
        ], 201);
    }

    /** Champs facultatifs du formulaire de réservation, nettoyés et bornés. */
    private function readDetails(array $input): array
    {
        $text = function (string $key, int $max) use ($input): ?string {
            if (!isset($input[$key]) || !is_scalar($input[$key])) {
                return null;
            }
            $value = Validator::sanitizeString($input[$key]);
            if ($value === '') {
                return null;
            }
            if (mb_strlen($value) > $max) {
                Response::error("Le champ {$key} est trop long.", 422);
            }
            return $value;
        };
        $time = function (string $key) use ($input): ?string {
            $value = isset($input[$key]) && is_string($input[$key]) ? trim($input[$key]) : '';
            if ($value === '') {
                return null;
            }
            if (!preg_match('/^([01]\d|2[0-3]):[0-5]\d$/', $value)) {
                Response::error('Heure invalide (format HH:MM).', 422);
            }
            return $value . ':00';
        };

        $payment = $text('payment_method', 30);
        if ($payment !== null && !in_array($payment, self::PAYMENT_METHODS, true)) {
            Response::error('Moyen de paiement invalide.', 422);
        }

        return [
            'pickup_place' => $text('pickup_place', 150),
            'pickup_time' => $time('pickup_time'),
            'return_place' => $text('return_place', 150),
            'return_time' => $time('return_time'),
            'delivery_address' => $text('delivery_address', 255),
            'license_number' => $text('license_number', 50),
            'payment_method' => $payment,
            'client_note' => $text('client_note', 1000),
        ];
    }

    /** Verrou sur la voiture (dans une transaction) : les vérifications de chevauchement passent une par une. */
    private function lockCar(int $carId): void
    {
        $this->pdo->prepare('SELECT id FROM cars WHERE id = ? FOR UPDATE')->execute([$carId]);
    }

    /** Relit la réservation en la verrouillant (dans une transaction). */
    private function lockReservation(int $id): array
    {
        $stmt = $this->pdo->prepare('SELECT * FROM reservations WHERE id = ? FOR UPDATE');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) {
            $this->fail('Réservation introuvable.', 404);
        }
        return $row;
    }

    /** Demandes en attente d'un client dont la location n'est pas encore passée. */
    private function countActivePending(int $userId): int
    {
        $stmt = $this->pdo->prepare("SELECT COUNT(*) FROM reservations
            WHERE user_id = ? AND status = 'pending' AND end_date >= CURDATE()");
        $stmt->execute([$userId]);
        return (int) $stmt->fetchColumn();
    }

    /** Annule la transaction en cours puis renvoie l'erreur. */
    private function fail(string $message, int $status): never
    {
        $this->rollBack();
        Response::error($message, $status);
        exit;
    }

    private function rollBack(): void
    {
        if ($this->pdo->inTransaction()) {
            $this->pdo->rollBack();
        }
    }

    private function getJsonInput(): array
    {
        $raw = file_get_contents('php://input');
        $data = json_decode($raw, true);
        return is_array($data) ? $data : [];
    }
}
