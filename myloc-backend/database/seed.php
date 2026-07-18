<?php
/**
 * Seeder for the MYLOC.DZ backend.
 *
 * Creates a single seeded admin account.
 * WARNING: The credentials below are placeholder dev credentials.
 *          They MUST be changed before any real deployment.
 */

require __DIR__ . '/../vendor/autoload.php';

use Myloc\Config\Database;
use Myloc\Utils\Response;

set_exception_handler(function (Throwable $e) {
    Response::error('Seeder failed: ' . $e->getMessage(), 500);
});

$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/..');
$dotenv->safeLoad();

try {
    $db = (new Database())->getPdo();

    $email = 'admin@admin';
    $plainPassword = 'admin';
    $fullName = 'Administrator';
    $phone = '+213 000 00 00 00';

    $stmt = $db->prepare("SELECT id FROM users WHERE email = :email LIMIT 1");
    $stmt->execute([':email' => $email]);

    if ($stmt->fetch()) {
        echo "Admin account already exists.\n";
        exit(0);
    }

    // Store a secure hash even for this placeholder dev account.
    $hash = password_hash($plainPassword, PASSWORD_BCRYPT);

    $stmt = $db->prepare("
        INSERT INTO users (full_name, email, password_hash, phone, role)
        VALUES (:full_name, :email, :password_hash, :phone, 'admin')
    ");
    $stmt->execute([
        ':full_name' => $fullName,
        ':email' => $email,
        ':password_hash' => $hash,
        ':phone' => $phone,
    ]);

    echo "Seeded admin account: {$email} / {$plainPassword}\n";
    echo "IMPORTANT: Change these credentials before production.\n";
} catch (Throwable $e) {
    fwrite(STDERR, "Seeder error: " . $e->getMessage() . "\n");
    exit(1);
}
