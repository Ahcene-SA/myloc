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

    public function show(array $params): void
    {
        $id = (int) $params['id'];
        $car = $this->carModel->findById($id);

        if (!$car) {
            Response::error('Car not found.', 404);
        }

        Response::success('Car retrieved.', ['car' => $car]);
    }

    public function create(): void
    {
        $input = $this->getJsonInput();
        $data = $this->validateCarInput($input, true);

        $carId = $this->carModel->create($data);
        $car = $this->carModel->findById($carId, true);

        Response::success('Car created.', ['car' => $car], 201);
    }

    public function update(array $params): void
    {
        $id = (int) $params['id'];
        $existing = $this->carModel->findById($id, true);
        if (!$existing) {
            Response::error('Car not found.', 404);
        }

        $input = $this->getJsonInput();
        $data = $this->validateCarInput($input, false);

        $this->carModel->update($id, $data);
        $car = $this->carModel->findById($id, true);

        Response::success('Car updated.', ['car' => $car]);
    }

    public function delete(array $params): void
    {
        $id = (int) $params['id'];
        $existing = $this->carModel->findById($id, true);
        if (!$existing) {
            Response::error('Car not found.', 404);
        }

        $this->carModel->setUnavailable($id);
        Response::success('Car marked as unavailable.');
    }

    public function uploadImage(): void
    {
        if (empty($_FILES['image'])) {
            Response::error('No image file provided.', 422);
        }

        $file = $_FILES['image'];

        if ($file['error'] !== UPLOAD_ERR_OK) {
            Response::error('Image upload failed.', 400);
        }

        $allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        $finfo = new \finfo(FILEINFO_MIME_TYPE);
        $mimeType = $finfo->file($file['tmp_name']);

        if (!in_array($mimeType, $allowedTypes, true)) {
            Response::error('Invalid image type. Allowed: jpeg, png, webp, gif.', 422);
        }

        $maxSize = 5 * 1024 * 1024; // 5 MB
        if ($file['size'] > $maxSize) {
            Response::error('Image too large. Maximum size is 5 MB.', 422);
        }

        $uploadDir = __DIR__ . '/../../public/images/cars';
        if (!is_dir($uploadDir)) {
            if (!mkdir($uploadDir, 0755, true) && !is_dir($uploadDir)) {
                Response::error('Failed to create upload directory.', 500);
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
            Response::error('Failed to save uploaded image.', 500);
        }

        $scheme = $_SERVER['REQUEST_SCHEME'] ?? 'http';
        $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
        $publicPath = dirname($_SERVER['SCRIPT_NAME']);
        $publicPath = $publicPath === '/' ? '' : $publicPath;
        $imageUrl = "{$scheme}://{$host}{$publicPath}/images/cars/{$filename}";

        Response::success('Image uploaded.', ['image_url' => $imageUrl]);
    }

    private function validateCarInput(array $input, bool $requireAll): array
    {
        $fields = ['name', 'price_per_day', 'transmission', 'seats', 'year'];
        $optional = ['category', 'description', 'image_url', 'status'];

        if ($requireAll) {
            $missing = Validator::required($input, $fields);
            if (!empty($missing)) {
                Response::error('Missing required fields.', 422, ['missing' => $missing]);
            }
        }

        $data = [];

        if (array_key_exists('category', $input)) {
            $category = Validator::sanitizeString($input['category']);
            if ($category !== '' && !Validator::inArray($category, ['citadine', 'suv', 'berline'])) {
                Response::error('Category must be citadine, suv, or berline.', 422);
            }
            if ($category !== '') {
                $data['category'] = $category;
            }
        }

        if (array_key_exists('name', $input)) {
            $name = Validator::sanitizeString($input['name']);
            if (!Validator::stringLength($name, 2, 100)) {
                Response::error('Name must be between 2 and 100 characters.', 422);
            }
            $data['name'] = $name;
        }

        if (array_key_exists('description', $input)) {
            $data['description'] = Validator::sanitizeString($input['description']);
        }

        if (array_key_exists('price_per_day', $input)) {
            $price = filter_var($input['price_per_day'], FILTER_VALIDATE_FLOAT);
            if ($price === false || $price <= 0) {
                Response::error('Price per day must be a positive number.', 422);
            }
            $data['price_per_day'] = $price;
        }

        if (array_key_exists('transmission', $input)) {
            $transmission = Validator::sanitizeString($input['transmission']);
            if (!Validator::inArray($transmission, ['manuel', 'automatique'])) {
                Response::error('Transmission must be manuel or automatique.', 422);
            }
            $data['transmission'] = $transmission;
        }

        if (array_key_exists('seats', $input)) {
            $seats = filter_var($input['seats'], FILTER_VALIDATE_INT);
            if ($seats === false || $seats <= 0) {
                Response::error('Seats must be a positive integer.', 422);
            }
            $data['seats'] = $seats;
        }

        if (array_key_exists('year', $input)) {
            $year = filter_var($input['year'], FILTER_VALIDATE_INT);
            if ($year === false || $year < 1900 || $year > 2100) {
                Response::error('Year must be a valid year.', 422);
            }
            $data['year'] = $year;
        }

        if (array_key_exists('image_url', $input)) {
            $data['image_url'] = Validator::sanitizeString($input['image_url']);
        }

        if (array_key_exists('status', $input)) {
            $status = Validator::sanitizeString($input['status']);
            if (!Validator::inArray($status, ['available', 'unavailable'])) {
                Response::error('Status must be available or unavailable.', 422);
            }
            $data['status'] = $status;
        }

        if ($requireAll && empty($data)) {
            Response::error('No valid car data provided.', 422);
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
