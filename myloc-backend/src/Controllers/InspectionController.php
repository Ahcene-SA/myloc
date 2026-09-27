<?php

declare(strict_types=1);

namespace Myloc\Controllers;

use Myloc\Config\Database;
use Myloc\Middleware\AuthMiddleware;
use Myloc\Models\Inspection;
use Myloc\Models\Reservation;
use Myloc\Utils\Audit;
use Myloc\Utils\Response;
use Myloc\Utils\Validator;

/** États des lieux de départ et de retour (kilométrage, carburant, dommages, photos). */
class InspectionController
{
    public const ZONES = ['avant', 'capot', 'pare-brise', 'toit', 'arriere', 'coffre', 'flanc-gauche', 'flanc-droit', 'jantes', 'interieur'];

    private Inspection $inspections;
    private Reservation $reservations;

    public function __construct(Database $db)
    {
        $this->inspections = new Inspection($db);
        $this->reservations = new Reservation($db);
    }

    public function show(array $params): void
    {
        $id = (int) $params['id'];
        $user = AuthMiddleware::requireAuth();
        $reservation = $this->reservations->findById($id);
        // Le client peut consulter les états des lieux de ses propres locations
        if (!$reservation || (!AuthMiddleware::isStaffRole($user['role']) && (int) $reservation['user_id'] !== $user['user_id'])) {
            Response::error('Réservation introuvable.', 404);
        }
        Response::success('États des lieux.', ['inspections' => (object) $this->inspections->forReservation($id)]);
    }

    public function save(array $params): void
    {
        $admin = AuthMiddleware::requireStaff();
        $id = (int) $params['id'];
        $type = (string) $params['type'];
        if (!in_array($type, ['depart', 'retour'], true)) {
            Response::error('Type d\'état des lieux invalide.', 422);
        }
        if (!$this->reservations->findById($id)) {
            Response::error('Réservation introuvable.', 404);
        }

        $in = json_decode((string) file_get_contents('php://input'), true);
        $in = is_array($in) ? $in : [];

        $mileage = null;
        if (isset($in['mileage']) && $in['mileage'] !== '' && $in['mileage'] !== null) {
            $mileage = filter_var($in['mileage'], FILTER_VALIDATE_INT);
            if ($mileage === false || $mileage < 0 || $mileage > 2000000) {
                Response::error('Kilométrage invalide.', 422);
            }
        }
        $fuel = null;
        if (isset($in['fuel_level']) && $in['fuel_level'] !== '' && $in['fuel_level'] !== null) {
            $fuel = filter_var($in['fuel_level'], FILTER_VALIDATE_INT);
            if ($fuel === false || $fuel < 0 || $fuel > 8) {
                Response::error('Niveau de carburant invalide.', 422);
            }
        }

        $damages = [];
        foreach ((array) ($in['damages'] ?? []) as $d) {
            $zone = (string) ($d['zone'] ?? '');
            if (!in_array($zone, self::ZONES, true)) {
                continue;
            }
            $note = mb_substr(Validator::sanitizeString((string) ($d['note'] ?? '')), 0, 200);
            $damages[] = ['zone' => $zone, 'note' => $note];
        }

        $photos = [];
        foreach ((array) ($in['photos'] ?? []) as $path) {
            if (is_string($path) && preg_match('#^uploads/inspections/insp-[a-f0-9]{16}\.(jpg|png|webp)$#', $path)) {
                $photos[] = $path;
            }
        }
        $photos = array_slice(array_values(array_unique($photos)), 0, 12);

        $notes = mb_substr(Validator::sanitizeString((string) ($in['notes'] ?? '')), 0, 2000);

        $this->inspections->upsert($id, $type, [
            'mileage' => $mileage,
            'fuel_level' => $fuel,
            'damages' => $damages,
            'photos' => $photos,
            'notes' => $notes !== '' ? $notes : null,
        ], $admin['user_id']);
        Audit::log('inspection_' . $type, 'reservation', $id, [
            'mileage' => $mileage,
            'fuel' => $fuel,
            'damages' => count($damages),
            'photos' => count($photos),
        ]);

        Response::success('État des lieux enregistré.', ['inspections' => (object) $this->inspections->forReservation($id)]);
    }

    public function upload(): void
    {
        AuthMiddleware::requireStaff();
        if (empty($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {
            Response::error('Photo non reçue (5 Mo maximum).', 422);
        }
        $file = $_FILES['image'];
        $mime = (new \finfo(FILEINFO_MIME_TYPE))->file($file['tmp_name']);
        $ext = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'][$mime] ?? null;
        if (!$ext) {
            Response::error('Format non accepté (JPG, PNG ou WEBP).', 422);
        }
        if ($file['size'] > 5 * 1024 * 1024) {
            Response::error('Photo trop lourde (5 Mo maximum).', 422);
        }
        $dir = __DIR__ . '/../../public/uploads/inspections';
        if (!is_dir($dir) && !mkdir($dir, 0755, true) && !is_dir($dir)) {
            Response::error('Impossible de créer le dossier des photos.', 500);
        }
        $name = 'insp-' . bin2hex(random_bytes(8)) . '.' . $ext;
        if (!move_uploaded_file($file['tmp_name'], $dir . '/' . $name)) {
            Response::error('Impossible d\'enregistrer la photo.', 500);
        }
        Response::success('Photo envoyée.', ['path' => 'uploads/inspections/' . $name]);
    }
}
