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
            Response::error('Missing required fields.', 422, ['missing' => $required]);
        }

        $carId = filter_var($input['car_id'], FILTER_VALIDATE_INT);
        if ($carId === false || $carId <= 0) {
            Response::error('Invalid car ID.', 422);
        }

        $startDate = Validator::sanitizeString($input['start_date']);
        $endDate = Validator::sanitizeString($input['end_date']);

        if (!Validator::date($startDate) || !Validator::date($endDate)) {
            Response::error('Dates must be in YYYY-MM-DD format.', 422);
        }

        $start = \DateTimeImmutable::createFromFormat('Y-m-d', $startDate);
        $end = \DateTimeImmutable::createFromFormat('Y-m-d', $endDate);
        if ($end <= $start) {
            Response::error('End date must be after start date.', 422);
        }

        $fullName = Validator::sanitizeString($input['full_name']);
        $email = strtolower(Validator::sanitizeString($input['email']));
        $phone = Validator::sanitizeString($input['phone']);

        if (!Validator::email($email)) {
            Response::error('Invalid email format.', 422);
        }
        if (!Validator::stringLength($fullName, 2, 100)) {
            Response::error('Full name must be between 2 and 100 characters.', 422);
        }
        if (!Validator::stringLength($phone, 5, 20)) {
            Response::error('Phone must be between 5 and 20 characters.', 422);
        }

        $car = $this->carModel->findById($carId);
        if (!$car) {
            Response::error('Car not found or unavailable.', 404);
        }

        if ($this->reservationModel->hasOverlap($carId, $startDate, $endDate)) {
            Response::error('Car is not available for the selected dates.', 409);
        }

        $days = (int) $start->diff($end)->days;
        if ($days <= 0) {
            $days = 1;
        }
        $totalPrice = (float) $car['price_per_day'] * $days;

        $reservationId = $this->reservationModel->create(
            $user['user_id'],
            $carId,
            $startDate,
            $endDate,
            $fullName,
            $email,
            $phone,
            $totalPrice
        );

        $reservation = $this->reservationModel->findById($reservationId);

        Response::success('Reservation created.', [
            'reservation' => $reservation,
            'total_price' => $totalPrice,
            'days' => $days,
        ], 201);
    }

    public function myReservations(): void
    {
        $user = AuthMiddleware::requireClient();
        $reservations = $this->reservationModel->findByUserId($user['user_id']);
        Response::success('Reservations retrieved.', ['reservations' => $reservations]);
    }

    public function allReservations(): void
    {
        AuthMiddleware::requireAdmin();
        $reservations = $this->reservationModel->findAll();
        Response::success('Reservations retrieved.', ['reservations' => $reservations]);
    }

    public function updateStatus(array $params): void
    {
        AuthMiddleware::requireAdmin();
        $id = (int) $params['id'];

        $input = $this->getJsonInput();
        $required = Validator::required($input, ['status']);
        if (!empty($required)) {
            Response::error('Missing status field.', 422);
        }

        $status = Validator::sanitizeString($input['status']);
        if (!Validator::inArray($status, ['pending', 'confirmed', 'rejected', 'cancelled'])) {
            Response::error('Status must be pending, confirmed, rejected, or cancelled.', 422);
        }

        $existing = $this->reservationModel->findById($id);
        if (!$existing) {
            Response::error('Reservation not found.', 404);
        }

        $adminNote = isset($input['admin_note']) ? Validator::sanitizeString($input['admin_note']) : null;

        $this->reservationModel->updateStatus($id, $status, $adminNote);
        Response::success('Reservation status updated.', ['admin_note' => $adminNote]);
    }

    private function getJsonInput(): array
    {
        $raw = file_get_contents('php://input');
        $data = json_decode($raw, true);
        return is_array($data) ? $data : [];
    }
}
