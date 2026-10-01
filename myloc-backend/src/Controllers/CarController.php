<?php

declare(strict_types=1);

namespace Myloc\Controllers;

use Myloc\Config\Database;
use Myloc\Models\Car;
use Myloc\Middleware\AuthMiddleware;
use Myloc\Utils\Audit;
use Myloc\Utils\Response;
use Myloc\Utils\Validator;

class CarController
{
    /** Plus grand montant accepté par une colonne DECIMAL(10, 2). */
    public const MAX_AMOUNT = 99999999.99;

    private Car $carModel;
    private Database $db;

    public function __construct(Database $db)
    {
        $this->db = $db;
        $this->carModel = new Car($db);
    }

    public function index(): void
    {
        if (isset($_GET['category']) && !is_string($_GET['category'])) {
            Response::error('Catégorie invalide.', 422);
        }
        $category = isset($_GET['category']) ? Validator::sanitizeString($_GET['category']) : null;
        $cars = array_map([$this, 'publicCar'], $this->carModel->findAllAvailable($category));
        Response::success('Véhicules récupérés.', ['cars' => $cars]);
    }

    /** Public : véhicules libres entre deux dates, avec le prix total. */
    public function availableForDates(): void
    {
        $start = Validator::str($_GET['start'] ?? '');
        $end = Validator::str($_GET['end'] ?? '');
        $category = isset($_GET['category']) && $_GET['category'] !== 'all' ? Validator::str($_GET['category']) : null;
        if (!Validator::date($start) || !Validator::date($end)) {
            Response::error('Choisissez une date de départ et une date de retour.', 422);
        }
        $s = \DateTimeImmutable::createFromFormat('!Y-m-d', $start);
        $e = \DateTimeImmutable::createFromFormat('!Y-m-d', $end);
        if ($s < new \DateTimeImmutable('today')) {
            Response::error('La date de départ ne peut pas être dans le passé.', 422);
        }
        if ($e <= $s) {
            Response::error('La date de retour doit être après la date de départ.', 422);
        }
        if ($category !== null && !in_array($category, ['citadine', 'compacte', 'suv', 'berline'], true)) {
            Response::error('Catégorie invalide.', 422);
        }
        $days = (int) $s->diff($e)->days;
        if ($days > 90) {
            Response::error('Pour plus de 90 jours, contactez-nous directement.', 422);
        }
        $pricing = new \Myloc\Services\Pricing($this->db);
        $cars = array_map(function (array $car) use ($days, $pricing) {
            $q = $pricing->quote((float) $car['price_per_day'], $days);
            $car['days'] = $days;
            $car['base_price'] = $q['base_price'];
            $car['total_price'] = $q['total_price'];
            $car['discount_label'] = $q['discount_label'];
            return $this->publicCar($car);
        }, $this->carModel->findFreeBetween($start, $end, $category));

        Response::success('Disponibilités calculées.', ['cars' => $cars, 'days' => $days]);
    }

    /** Administration : toute la flotte, y compris les véhicules retirés du site. */
    public function adminIndex(): void
    {
        Response::success('Véhicules récupérés.', ['cars' => $this->carModel->findAll()]);
    }

    public function show(array $params): void
    {
        $id = (int) $params['id'];
        $car = $this->carModel->findById($id);

        if (!$car) {
            Response::error('Véhicule introuvable.', 404);
        }

        Response::success('Véhicule récupéré.', ['car' => $this->publicCar($car)]);
    }

    public function create(): void
    {
        $input = $this->getJsonInput();
        $data = $this->validateCarInput($input, true);

        $carId = $this->carModel->create($data);
        $car = $this->carModel->findById($carId, true);
        Audit::log('car_created', 'car', $carId, ['name' => $car['name'], 'price_per_day' => $car['price_per_day']]);

        Response::success('Véhicule ajouté.', ['car' => $car], 201);
    }

    public function update(array $params): void
    {
        $id = (int) $params['id'];
        $existing = $this->carModel->findById($id, true);
        if (!$existing) {
            Response::error('Véhicule introuvable.', 404);
        }

        $input = $this->getJsonInput();
        // Un employé peut seulement mettre en ligne / retirer du site
        $actor = AuthMiddleware::current();
        if (($actor['role'] ?? '') !== 'owner' && array_diff(array_keys($input), ['status'])) {
            Response::error('Seul le propriétaire peut modifier les informations et le prix d\'un véhicule.', 403);
        }
        $data = $this->validateCarInput($input, false);

        $this->carModel->update($id, $data);
        $car = $this->carModel->findById($id, true);

        $changes = [];
        foreach ($data as $k => $v) {
            if ((string) ($existing[$k] ?? '') !== (string) $v) {
                $changes[$k] = [$existing[$k] ?? null, $v];
            }
        }
        if ($changes) {
            $action = array_keys($changes) === ['status']
                ? ($data['status'] === 'available' ? 'car_online' : 'car_offline')
                : (isset($changes['price_per_day']) ? 'car_price_changed' : 'car_updated');
            Audit::log($action, 'car', $id, ['name' => $existing['name'], 'changes' => $changes]);
        }

        Response::success('Véhicule mis à jour.', ['car' => $car]);
    }

    /**
     * Supprime un véhicule. S'il a déjà des réservations (historique à garder),
     * il est seulement retiré du site.
     */
    public function delete(array $params): void
    {
        $id = (int) $params['id'];
        $existing = $this->carModel->findById($id, true);
        if (!$existing) {
            Response::error('Véhicule introuvable.', 404);
        }

        if ($this->carModel->countReservations($id) > 0) {
            $this->carModel->setUnavailable($id);
            Audit::log('car_offline', 'car', $id, ['name' => $existing['name'], 'reason' => 'suppression demandée (historique conservé)']);
            Response::success('Ce véhicule a un historique de réservations : il a été retiré du site au lieu d\'être supprimé.', ['deleted' => false]);
        }

        $this->carModel->hardDelete($id);
        Audit::log('car_deleted', 'car', $id, ['name' => $existing['name']]);
        $image = (string) ($existing['image_url'] ?? '');
        if (preg_match('#^images/cars/car-[a-f0-9]{16}\.(png|jpg|webp|gif)$#', $image)) {
            @unlink(__DIR__ . '/../../public/' . $image);
        }
        Response::success('Véhicule supprimé.', ['deleted' => true]);
    }

    public function uploadImage(): void
    {
        if (empty($_FILES['image'])) {
            Response::error('Aucune image reçue.', 422);
        }

        $file = $_FILES['image'];

        if ($file['error'] !== UPLOAD_ERR_OK) {
            $msg = match ($file['error']) {
                UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE => 'Image trop lourde (5 Mo maximum).',
                UPLOAD_ERR_PARTIAL => 'Envoi interrompu, réessayez.',
                UPLOAD_ERR_NO_FILE => 'Aucune image reçue.',
                default => 'Le serveur n\'a pas pu enregistrer l\'image.',
            };
            Response::error($msg, 400);
        }

        $allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        $finfo = new \finfo(FILEINFO_MIME_TYPE);
        $mimeType = $finfo->file($file['tmp_name']);

        if (!in_array($mimeType, $allowedTypes, true)) {
            Response::error('Format d\'image non accepté (JPG, PNG, WEBP ou GIF).', 422);
        }

        $maxSize = 5 * 1024 * 1024; // 5 MB
        if ($file['size'] > $maxSize) {
            Response::error('Image trop lourde (5 Mo maximum).', 422);
        }

        $uploadDir = __DIR__ . '/../../public/images/cars';
        if (!is_dir($uploadDir)) {
            if (!mkdir($uploadDir, 0755, true) && !is_dir($uploadDir)) {
                Response::error('Impossible de créer le dossier des images.', 500);
            }
        }

        $extension = match ($mimeType) {
            'image/jpeg' => 'jpg',
            'image/png' => 'png',
            'image/webp' => 'webp',
            'image/gif' => 'gif',
            default => 'png',
        };

        $filename = 'car-' . bin2hex(random_bytes(8)) . '.' . $extension;
        $targetPath = $uploadDir . '/' . $filename;

        if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
            Response::error('Impossible d\'enregistrer l\'image.', 500);
        }

        // Return a relative path so the frontend can prepend its API base.
        $imageUrl = "images/cars/{$filename}";

        Response::success('Image envoyée.', ['image_url' => $imageUrl]);
    }

    private function validateCarInput(array $input, bool $requireAll): array
    {
        $fields = ['name', 'price_per_day', 'transmission', 'seats', 'year'];
        $optional = ['category', 'plate', 'description', 'image_url', 'status'];

        if ($requireAll) {
            $missing = Validator::required($input, $fields);
            if (!empty($missing)) {
                Response::error('Champs obligatoires manquants.', 422, ['missing' => $missing]);
            }
        }

        $data = [];

        if (array_key_exists('category', $input)) {
            $category = Validator::sanitizeString($input['category']);
            if ($category !== '' && !Validator::inArray($category, ['citadine', 'compacte', 'suv', 'berline'])) {
                Response::error('Catégorie invalide.', 422);
            }
            if ($category !== '') {
                $data['category'] = $category;
            }
        }

        if (array_key_exists('name', $input)) {
            $name = Validator::sanitizeString($input['name']);
            if (!Validator::stringLength($name, 2, 100)) {
                Response::error('Le nom doit contenir entre 2 et 100 caractères.', 422);
            }
            $data['name'] = $name;
        }

        if (array_key_exists('plate', $input)) {
            $plate = strtoupper(Validator::sanitizeString($input['plate']));
            if (mb_strlen($plate) > 20) {
                Response::error('Immatriculation trop longue.', 422);
            }
            $data['plate'] = $plate !== '' ? $plate : null;
        }

        if (array_key_exists('description', $input)) {
            $data['description'] = Validator::sanitizeString($input['description']);
        }

        if (array_key_exists('price_per_day', $input)) {
            $price = filter_var($input['price_per_day'], FILTER_VALIDATE_FLOAT);
            if ($price === false || $price <= 0) {
                Response::error('Le prix par jour doit être un nombre positif.', 422);
            }
            // DECIMAL(10, 2) en base : au-delà, MySQL refuserait la valeur (erreur 500)
            if ($price > self::MAX_AMOUNT) {
                Response::error('Le prix par jour est trop élevé (99 999 999,99 maximum).', 422);
            }
            $data['price_per_day'] = round((float) $price, 2);
        }

        if (array_key_exists('transmission', $input)) {
            $transmission = Validator::sanitizeString($input['transmission']);
            if (!Validator::inArray($transmission, ['manuel', 'automatique'])) {
                Response::error('Boîte de vitesses invalide (manuelle ou automatique).', 422);
            }
            $data['transmission'] = $transmission;
        }

        if (array_key_exists('seats', $input)) {
            $seats = filter_var($input['seats'], FILTER_VALIDATE_INT);
            if ($seats === false || $seats <= 0) {
                Response::error('Le nombre de places doit être un entier positif.', 422);
            }
            $data['seats'] = $seats;
        }

        if (array_key_exists('year', $input)) {
            $year = filter_var($input['year'], FILTER_VALIDATE_INT);
            if ($year === false || $year < 1900 || $year > 2100) {
                Response::error('Année invalide.', 422);
            }
            $data['year'] = $year;
        }

        if (array_key_exists('image_url', $input)) {
            $url = Validator::sanitizeString($input['image_url']);
            // Uniquement les fichiers renommés par notre upload (même règle que pour la
            // suppression, CarController::delete) : jamais une URL externe ou un autre schéma.
            $data['image_url'] = preg_match('#^images/cars/car-[a-f0-9]{16}\.(png|jpg|webp|gif)$#', $url) ? $url : '';
        }

        if (array_key_exists('status', $input)) {
            $status = Validator::sanitizeString($input['status']);
            if (!Validator::inArray($status, ['available', 'unavailable'])) {
                Response::error('Statut invalide.', 422);
            }
            $data['status'] = $status;
        }

        if ($requireAll && empty($data)) {
            Response::error('Aucune donnée valide.', 422);
        }

        return $data;
    }

    /** L'immatriculation reste interne à l'agence. */
    private function publicCar(array $car): array
    {
        unset($car['plate']);
        return $car;
    }

    private function getJsonInput(): array
    {
        $raw = file_get_contents('php://input');
        $data = json_decode($raw, true);
        return is_array($data) ? $data : [];
    }
}
