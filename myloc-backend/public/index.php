<?php

declare(strict_types=1);

// Serve existing static files directly without bootstrapping the app.
$uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
$staticPath = __DIR__ . $uri;
if (file_exists($staticPath) && is_file($staticPath)) {
    return false;
}

require __DIR__ . '/../vendor/autoload.php';

use Dotenv\Dotenv;
use Myloc\Config\Database;
use Myloc\Config\Timezone;
use Myloc\Controllers\AgencyController;
use Myloc\Controllers\AuthController;
use Myloc\Controllers\CarController;
use Myloc\Controllers\InspectionController;
use Myloc\Controllers\PasswordResetController;
use Myloc\Controllers\PricingController;
use Myloc\Controllers\ReservationController;
use Myloc\Middleware\AuthMiddleware;
use Myloc\Middleware\CorsMiddleware;
use Myloc\Router;
use Myloc\Utils\Response;

// Load environment variables from .env in the project root.
$dotenv = Dotenv::createImmutable(__DIR__ . '/..');
$dotenv->safeLoad();

// Fuseau horaire de l'agence (APP_TIMEZONE, Africa/Algiers par défaut), aussi appliqué à MySQL
Timezone::apply();

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
    $db = Database::shared();
} catch (Throwable $e) {
    Response::error('Service temporarily unavailable.', 503);
}

$authController = new AuthController($db);
$carController = new CarController($db);
$reservationController = new ReservationController($db);
$pricingController = new PricingController($db);
$inspectionController = new InspectionController($db);
$agencyController = new AgencyController($db);
$passwordResetController = new PasswordResetController($db);

$router = new Router();

// Auth routes
$router->post('/api/auth/register', fn() => $authController->register());
$router->post('/api/auth/login', fn() => $authController->login());
$router->get('/api/auth/me', fn() => $authController->me());
// Mot de passe oublié (clients et équipe)
$router->post('/api/auth/forgot', fn() => $passwordResetController->request());
$router->get('/api/auth/reset', fn() => $passwordResetController->check());
$router->post('/api/auth/reset', fn() => $passwordResetController->reset());
$router->put('/api/auth/me', fn() => $authController->updateMe());
$router->put('/api/auth/password', fn() => $authController->changePassword());
$router->get('/api/auth/clients', fn() => $authController->listClients(), 'admin');

// Espace agence : connexion, 2FA, équipe, journal
$router->post('/api/agency/login', fn() => $agencyController->login());
$router->post('/api/agency/verify', fn() => $agencyController->verifyTotp());
$router->get('/api/agency/me', fn() => $agencyController->me());
$router->post('/api/agency/logout-all', fn() => $agencyController->logoutAll(), 'staff');
$router->post('/api/agency/2fa/setup', fn() => $agencyController->twoFactorSetup(), 'staff');
$router->post('/api/agency/2fa/enable', fn() => $agencyController->twoFactorEnable(), 'staff');
$router->post('/api/agency/2fa/recovery-codes', fn() => $agencyController->regenerateRecoveryCodes(), 'staff');
$router->post('/api/agency/2fa/disable', fn() => $agencyController->twoFactorDisable(), 'staff');
$router->get('/api/agency/team', fn() => $agencyController->team(), 'owner');
$router->post('/api/agency/team', fn() => $agencyController->createMember(), 'owner');
$router->put('/api/agency/team/{id}', fn(array $p) => $agencyController->updateMember($p), 'owner');
$router->post('/api/agency/team/{id}/reset-password', fn(array $p) => $agencyController->resetMemberPassword($p), 'owner');
$router->post('/api/agency/team/{id}/reset-2fa', fn(array $p) => $agencyController->resetMemberTwoFactor($p), 'owner');
$router->get('/api/agency/audit', fn() => $agencyController->auditLog(), 'staff');
// Alertes : nouvelles demandes depuis la dernière vérification (ne prolonge pas la session)
$router->get('/api/agency/updates', fn() => $reservationController->updatesSince());

// Administration
$router->get('/api/admin/cars', fn() => $carController->adminIndex(), 'admin');
$router->post('/api/admin/reservations', fn() => $reservationController->adminCreate(), 'admin');
$router->put('/api/admin/pricing-rules', fn() => $pricingController->updateRules(), 'owner');
$router->get('/api/admin/promos', fn() => $pricingController->listPromos(), 'owner');
$router->post('/api/admin/promos', fn() => $pricingController->createPromo(), 'owner');
$router->put('/api/admin/promos/{id}', fn(array $p) => $pricingController->updatePromo($p), 'owner');
$router->delete('/api/admin/promos/{id}', fn(array $p) => $pricingController->deletePromo($p), 'owner');
$router->post('/api/admin/inspections/upload', fn() => $inspectionController->upload(), 'admin');
$router->put('/api/admin/reservations/{id}/inspections/{type}', fn(array $p) => $inspectionController->save($p), 'admin');
$router->get('/api/reservations/{id}/inspections', fn(array $p) => $inspectionController->show($p));

// Prix et remises (public)
$router->post('/api/pricing/quote', fn() => $pricingController->quote());
$router->get('/api/pricing/rules', fn() => $pricingController->publicRules());

// Public car routes
$router->get('/api/cars', fn() => $carController->index());
$router->get('/api/cars/available', fn() => $carController->availableForDates());
$router->get('/api/cars/{id}', fn(array $params) => $carController->show($params));
$router->get('/api/cars/{id}/booked', fn(array $params) => $reservationController->bookedDates($params));

// Car management routes (admin only)
$router->post('/api/cars', fn() => $carController->create(), 'owner');
$router->post('/api/cars/upload', fn() => $carController->uploadImage(), 'owner');
$router->put('/api/cars/{id}', fn(array $params) => $carController->update($params), 'admin');
$router->delete('/api/cars/{id}', fn(array $params) => $carController->delete($params), 'owner');

// Reservation routes (role checks are done inside ReservationController)
$router->post('/api/reservations', fn() => $reservationController->create());
$router->get('/api/reservations/me', fn() => $reservationController->myReservations());
$router->patch('/api/reservations/{id}/cancel', fn(array $params) => $reservationController->cancel($params));
$router->get('/api/reservations', fn() => $reservationController->allReservations());
$router->patch('/api/reservations/{id}/status', fn(array $params) => $reservationController->updateStatus($params));

// The Router enforces the role argument above before invoking the handler.
$router->dispatch();
