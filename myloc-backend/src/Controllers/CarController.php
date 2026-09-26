<?php

declare(strict_types=1);

namespace Myloc\Controllers;

use Myloc\Config\Database;
use Myloc\Models\Car;
use Myloc\Utils\Response;
use Myloc\Utils\Validator;

class CarController
{
    private Car $carModel;

    public function __construct(Database $db)
    {
        $this->carModel = new Car($db);
    }

    public function index(): void
    {
        $category = $_GET['category'] ?? null;
        $cars = $this->carModel->findAllAvailable($category);
        Response::success('Cars retrieved.', ['cars' => $cars]);
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

        Response::success('Véhicule récupéré.', ['car' => $car]);
    }

    public function create(): void
    {
        $input = $this->getJsonInput();
        $data = $this->validateCarInput($input, true);

        $carId = $this->carModel->create($data);
        $car = $this->carModel->findById($carId, true);

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
        $data = $this->validateCarInput($input, false);

        $this->carModel->update($id, $data);
        $car = $this->carModel->findById($id, true);

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
            Response::success('Ce véhicule a un historique de réservations : il a été retiré du site au lieu d\'être supprimé.', ['deleted' => false]);
        }

        $this->carModel->hardDelete($id);
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
        $optional = ['category', 'description', 'image_url', 'status'];

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

        if (array_key_exists('description', $input)) {
            $data['description'] = Validator::sanitizeString($input['description']);
        }

        if (array_key_exists('price_per_day', $input)) {
            $price = filter_var($input['price_per_day'], FILTER_VALIDATE_FLOAT);
            if ($price === false || $price <= 0) {
                Response::error('Le prix par jour doit être un nombre positif.', 422);
            }
            $data['price_per_day'] = $price;
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
            $data['image_url'] = Validator::sanitizeString($input['image_url']);
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

    private function getJsonInput(): array
    {
        $raw = file_get_contents('php://input');
        $data = json_decode($raw, true);
        return is_array($data) ? $data : [];
    }
}
