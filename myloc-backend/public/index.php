<?php

declare(strict_types=1);

require __DIR__ . '/../vendor/autoload.php';

use Dotenv\Dotenv;
use Myloc\Config\Database;
use Myloc\Controllers\AuthController;
use Myloc\Controllers\CarController;
use Myloc\Controllers\ReservationController;
use Myloc\Middleware\AuthMiddleware;
use Myloc\Middleware\CorsMiddleware;
use Myloc\Router;
use Myloc\Utils\Response;

// Load environment variables from .env in the project root.
$dotenv = Dotenv::createImmutable(__DIR__ . '/..');
$dotenv->safeLoad();

// Error handling: do not leak internal details in production.
$appEnv = $_ENV['APP_ENV'] ?? 'production';
if ($appEnv !== 'development') {
    ini_set('display_errors', '0');
    error_reporting(0);
}

set_exception_handler(function (Throwable $e) use ($appEnv) {
    // Log the real error server-side. In production, use a proper logger.
    error_log($e->getMessage());

    $message = $appEnv === 'development'
        ? $e->getMessage()
        : 'An unexpected error occurred.';

    Response::error($message, 500);
});

// Apply CORS headers and handle preflight requests.
CorsMiddleware::apply();

// Database connection.
try {
    $db = new Database();
} catch (Throwable $e) {
    Response::error('Service temporarily unavailable.', 503);
}

$authController = new AuthController($db);
$carController = new CarController($db);
$reservationController = new ReservationController($db);

$router = new Router();

// Auth routes
$router->post('/api/auth/register', fn() => $authController->register());
$router->post('/api/auth/login', fn() => $authController->login());
$router->get('/api/auth/me', fn() => $authController->me());

// Public car routes
$router->get('/api/cars', fn() => $carController->index());
$router->get('/api/cars/{id}', fn(array $params) => $carController->show($params));

// Admin car routes
$router->post('/api/cars', fn() => $carController->create(), 'admin');
$router->put('/api/cars/{id}', fn(array $params) => $carController->update($params), 'admin');
$router->delete('/api/cars/{id}', fn(array $params) => $carController->delete($params), 'admin');

// Reservation routes
$router->post('/api/reservations', fn() => $reservationController->create(), 'client');
$router->get('/api/reservations/me', fn() => $reservationController->myReservations(), 'client');
$router->get('/api/reservations', fn() => $reservationController->allReservations(), 'admin');
$router->patch('/api/reservations/{id}/status', fn(array $params) => $reservationController->updateStatus($params), 'admin');

// Map the generic role requirement to the actual middleware.
// The Router itself does not enforce roles; we wrap the handlers below.
// NOTE: The role argument above is stored but not used by the current Router dispatch.
// Instead, each controller calls AuthMiddleware::requireClient/Admin directly.

$router->dispatch();
