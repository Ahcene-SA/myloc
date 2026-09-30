<?php
/**
 * Seeder for the MYLOC.DZ backend.
 *
 * Creates the admin account (credentials read from .env: ADMIN_EMAIL / ADMIN_PASSWORD)
 * and, if the cars table is empty, the demo fleet shown on the website.
 */

require __DIR__ . '/../vendor/autoload.php';

use Myloc\Config\Database;
use Myloc\Utils\Response;

set_exception_handler(function (Throwable $e) {
    Response::error('Seeder failed: ' . $e->getMessage(), 500);
});

$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/..');
$dotenv->safeLoad();
\Myloc\Config\Timezone::apply();

try {
    $db = (new Database())->getPdo();

    $email = $_ENV['ADMIN_EMAIL'] ?? '';
    $plainPassword = $_ENV['ADMIN_PASSWORD'] ?? '';
    if ($email === '' || strlen($plainPassword) < 8) {
        fwrite(STDERR, "Set ADMIN_EMAIL and ADMIN_PASSWORD (8+ characters) in .env before seeding.\n");
        exit(1);
    }
    $fullName = 'Administrator';
    $phone = '+213 000 00 00 00';

    $stmt = $db->prepare("SELECT id FROM users WHERE email = :email LIMIT 1");
    $stmt->execute([':email' => $email]);

    $existing = $stmt->fetch();
    if ($existing) {
        // Le compte existe déjà (ex. inscrit comme client) : on le passe admin
        // et on aligne son mot de passe sur celui du .env.
        $stmt = $db->prepare("UPDATE users SET role = 'owner', active = 1, password_hash = :hash WHERE id = :id");
        $stmt->execute([':hash' => password_hash($plainPassword, PASSWORD_BCRYPT), ':id' => $existing['id']]);
        echo "Compte propriétaire mis à jour (rôle + mot de passe du .env) : {$email}\n";
    } else {
        $hash = password_hash($plainPassword, PASSWORD_BCRYPT);
        $stmt = $db->prepare("
            INSERT INTO users (full_name, email, password_hash, phone, role)
            VALUES (:full_name, :email, :password_hash, :phone, 'owner')
        ");
        $stmt->execute([
            ':full_name' => $fullName,
            ':email' => $email,
            ':password_hash' => $hash,
            ':phone' => $phone,
        ]);
        echo "Seeded admin account: {$email}\n";
    }

    // Demo fleet (same cars as on the website), only if the table is empty.
    $count = (int) $db->query("SELECT COUNT(*) FROM cars")->fetchColumn();
    if ($count === 0) {
        // Flotte réelle de l'agence (voir database/flotte.php)
        require __DIR__ . '/flotte.php';
    } else {
        echo "Cars table not empty ({$count} cars): demo fleet skipped.\n";
    }
} catch (Throwable $e) {
    fwrite(STDERR, "Seeder error: " . $e->getMessage() . "\n");
    exit(1);
}
