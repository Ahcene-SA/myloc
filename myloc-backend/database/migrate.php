<?php
/**
 * Mise à jour idempotente du schéma MYLOC.DZ (peut être relancé sans risque).
 * Usage : php database/migrate.php
 */

declare(strict_types=1);

require __DIR__ . '/../vendor/autoload.php';

use Myloc\Config\Database;

$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/..');
$dotenv->safeLoad();

try {
    $pdo = (new Database())->getPdo();
    $dbName = $pdo->query('SELECT DATABASE()')->fetchColumn();

    $hasColumn = function (string $table, string $column) use ($pdo, $dbName): bool {
        $stmt = $pdo->prepare('SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?');
        $stmt->execute([$dbName, $table, $column]);
        return (bool) $stmt->fetchColumn();
    };

    $changes = 0;

    // 1. Catégorie « compacte »
    $type = $pdo->query("SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cars' AND COLUMN_NAME = 'category'")->fetchColumn();
    if ($type && !str_contains((string) $type, "'compacte'")) {
        $pdo->exec("ALTER TABLE cars MODIFY COLUMN category ENUM('citadine', 'compacte', 'suv', 'berline') NOT NULL DEFAULT 'citadine'");
        echo "✓ cars.category : ajout de « compacte »\n";
        $changes++;
    }

    // 2. Détails de réservation (lieux, heures, permis, paiement, note)
    $reservationColumns = [
        'admin_note'       => 'TEXT NULL AFTER status',
        'pickup_place'     => 'VARCHAR(150) NULL',
        'pickup_time'      => 'TIME NULL',
        'return_place'     => 'VARCHAR(150) NULL',
        'return_time'      => 'TIME NULL',
        'delivery_address' => 'VARCHAR(255) NULL',
        'license_number'   => 'VARCHAR(50) NULL',
        'payment_method'   => 'VARCHAR(30) NULL',
        'client_note'      => 'TEXT NULL',
        'updated_at'       => 'TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP',
    ];
    foreach ($reservationColumns as $column => $definition) {
        if (!$hasColumn('reservations', $column)) {
            $pdo->exec("ALTER TABLE reservations ADD COLUMN {$column} {$definition}");
            echo "✓ reservations.{$column} ajoutée\n";
            $changes++;
        }
    }

    // 3. Réservations saisies par l'agence (sans compte client)
    if (!$hasColumn('reservations', 'source')) {
        $pdo->exec("ALTER TABLE reservations ADD COLUMN source VARCHAR(20) NOT NULL DEFAULT 'site' AFTER status");
        echo "✓ reservations.source ajoutée\n";
        $changes++;
    }
    $isNullable = function (string $table, string $column) use ($pdo, $dbName): bool {
        $stmt = $pdo->prepare('SELECT IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?');
        $stmt->execute([$dbName, $table, $column]);
        return $stmt->fetchColumn() === 'YES';
    };
    if (!$isNullable('reservations', 'user_id')) {
        $pdo->exec("ALTER TABLE reservations MODIFY COLUMN user_id INT NULL");
        echo "✓ reservations.user_id facultatif (réservations prises par l'agence)\n";
        $changes++;
    }
    if (!$isNullable('reservations', 'email')) {
        $pdo->exec("ALTER TABLE reservations MODIFY COLUMN email VARCHAR(255) NULL");
        echo "✓ reservations.email facultatif\n";
        $changes++;
    }

    echo $changes === 0 ? "Schéma déjà à jour.\n" : "Schéma mis à jour ({$changes} changement(s)).\n";
} catch (Throwable $e) {
    fwrite(STDERR, 'Migration error: ' . $e->getMessage() . "\n");
    exit(1);
}
