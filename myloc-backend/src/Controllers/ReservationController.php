<?php

declare(strict_types=1);

namespace Myloc\Controllers;

use Myloc\Config\Database;
use Myloc\Middleware\AuthMiddleware;
use Myloc\Models\Car;
use Myloc\Models\Reservation;
use Myloc\Utils\Response;
use Myloc\Utils\Validator;

class ReservationController
{
    private const MAX_DAYS = 90;
    private const PAYMENT_METHODS = ['especes', 'carte', 'virement'];

    private Reservation $reservationModel;
    private Car $carModel;

    public function __construct(Database $db)
    {
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

        $startDate = Validator::sanitizeString((string) $input['start_date']);
        $endDate = Validator::sanitizeString((string) $input['end_date']);
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
        $days = (int) $start->diff($end)->days;
        if ($days > self::MAX_DAYS) {
            Response::error('La durée maximale d\'une location en ligne est de ' . self::MAX_DAYS . ' jours. Contactez-nous pour une location longue durée.', 422);
        }

        $fullName = Validator::sanitizeString((string) $input['full_name']);
        $email = strtolower(Validator::sanitizeString((string) $input['email']));
        $phone = Validator::sanitizeString((string) $input['phone']);
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

        if ($this->reservationModel->hasOverlap($carId, $startDate, $endDate)) {
            Response::error('Ce véhicule est déjà réservé sur ces dates. Choisissez d\'autres dates ou un autre véhicule.', 409);
        }

        $totalPrice = round((float) $car['price_per_day'] * $days, 2);

        $reservationId = $this->reservationModel->create(
            $user['user_id'],
            $carId,
            $startDate,
            $endDate,
            $fullName,
            $email,
            $phone,
            $totalPrice,
            $details
        );

        $reservation = $this->reservationModel->findById($reservationId);

        Response::success('Réservation envoyée.', [
            'reservation' => $reservation,
            'total_price' => $totalPrice,
            'days' => $days,
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

        $this->reservationModel->updateStatus($id, 'cancelled');
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
        AuthMiddleware::requireAdmin();
        $reservations = $this->reservationModel->findAll();
        Response::success('Réservations récupérées.', ['reservations' => $reservations]);
    }

    public function updateStatus(array $params): void
    {
        AuthMiddleware::requireAdmin();
        $id = (int) $params['id'];

        $input = $this->getJsonInput();
        $required = Validator::required($input, ['status']);
        if (!empty($required)) {
            Response::error('Statut manquant.', 422);
        }

        $status = Validator::sanitizeString((string) $input['status']);
        if (!Validator::inArray($status, ['pending', 'confirmed', 'rejected', 'cancelled'])) {
            Response::error('Statut invalide.', 422);
        }

        $existing = $this->reservationModel->findById($id);
        if (!$existing) {
            Response::error('Réservation introuvable.', 404);
        }

        $adminNote = isset($input['admin_note']) ? Validator::sanitizeString((string) $input['admin_note']) : null;

        $this->reservationModel->updateStatus($id, $status, $adminNote);
        Response::success('Statut mis à jour.', ['admin_note' => $adminNote]);
    }

    /** Champs facultatifs du formulaire de réservation, nettoyés et bornés. */
    private function readDetails(array $input): array
    {
        $text = function (string $key, int $max) use ($input): ?string {
            if (!isset($input[$key]) || !is_scalar($input[$key])) {
                return null;
            }
            $value = Validator::sanitizeString((string) $input[$key]);
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

    private function getJsonInput(): array
    {
        $raw = file_get_contents('php://input');
        $data = json_decode($raw, true);
        return is_array($data) ? $data : [];
    }
}
