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
        $cars = [
            ['citadine', 'Clio 5 Alpino', 55, 'automatique', 5, 2024, 'clio5-alpino.png'],
            ['citadine', 'Clio 5 Techno', 52, 'automatique', 5, 2024, 'clio5-techno.png'],
            ['citadine', 'Citroën C3', 48, 'manuel', 5, 2024, 'citroen-c3.png'],
            ['compacte', 'Opel Astra', 75, 'automatique', 5, 2024, 'opel-astra.png'],
            ['suv', 'Opel Mokka', 80, 'automatique', 5, 2024, 'opel-mokka.png'],
            ['suv', 'Renault Captur', 72, 'automatique', 5, 2024, 'renault-captur.png'],
            ['suv', 'Jetour X70+', 95, 'automatique', 7, 2025, 'jetour-x70-plus.png'],
        ];
        $stmt = $db->prepare("
            INSERT INTO cars (category, name, price_per_day, transmission, seats, year, image_url, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'available')
        ");
        foreach ($cars as [$cat, $name, $price, $trans, $seats, $year, $img]) {
            $stmt->execute([$cat, $name, $price, $trans, $seats, $year, "images/cars/{$img}"]);
        }
        echo "Seeded demo fleet: " . count($cars) . " cars\n";
    } else {
        echo "Cars table not empty ({$count} cars): demo fleet skipped.\n";
    }
} catch (Throwable $e) {
    fwrite(STDERR, "Seeder error: " . $e->getMessage() . "\n");
    exit(1);
}
