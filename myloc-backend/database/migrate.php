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
\Myloc\Config\Timezone::apply();

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
        'birth_date'       => 'DATE NULL',
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

    // 4. Remises : codes promo, règles (durée, fidélité), détail du prix sur la réservation
    $pricingColumns = [
        'base_price'      => 'DECIMAL(10, 2) NULL',
        'discount_amount' => 'DECIMAL(10, 2) NOT NULL DEFAULT 0',
        'discount_label'  => 'VARCHAR(120) NULL',
        'promo_code'      => 'VARCHAR(40) NULL',
    ];
    foreach ($pricingColumns as $column => $definition) {
        if (!$hasColumn('reservations', $column)) {
            $pdo->exec("ALTER TABLE reservations ADD COLUMN {$column} {$definition}");
            echo "✓ reservations.{$column} ajoutée\n";
            $changes++;
        }
    }
    $hasTable = function (string $table) use ($pdo, $dbName): bool {
        $stmt = $pdo->prepare('SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?');
        $stmt->execute([$dbName, $table]);
        return (bool) $stmt->fetchColumn();
    };
    if (!$hasTable('promo_codes')) {
        $pdo->exec("CREATE TABLE promo_codes (
            id INT AUTO_INCREMENT PRIMARY KEY,
            code VARCHAR(40) NOT NULL UNIQUE,
            description VARCHAR(160) NULL,
            discount_type ENUM('percent', 'fixed') NOT NULL DEFAULT 'percent',
            discount_value DECIMAL(10, 2) NOT NULL,
            min_days INT NULL,
            valid_from DATE NULL,
            valid_until DATE NULL,
            max_uses INT NULL,
            uses INT NOT NULL DEFAULT 0,
            active TINYINT(1) NOT NULL DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
        echo "✓ table promo_codes créée\n";
        $changes++;
    }
    if (!$hasTable('settings')) {
        $pdo->exec("CREATE TABLE settings (
            name VARCHAR(60) PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
        echo "✓ table settings créée\n";
        $changes++;
    }

    // 5b. Immatriculation (pour le contrat)
    if (!$hasColumn('cars', 'plate')) {
        $pdo->exec("ALTER TABLE cars ADD COLUMN plate VARCHAR(20) NULL AFTER name");
        echo "✓ cars.plate ajoutée\n";
        $changes++;
    }

    // 5. États des lieux (départ / retour)
    if (!$hasTable('inspections')) {
        $pdo->exec("CREATE TABLE inspections (
    id INT AUTO_INCREMENT PRIMARY KEY,
    reservation_id INT NOT NULL,
    type ENUM('depart', 'retour') NOT NULL,
    mileage INT NULL,
    fuel_level TINYINT NULL,
    damages TEXT NULL,
    photos TEXT NULL,
    notes TEXT NULL,
    created_by INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_reservation_type (reservation_id, type),
    CONSTRAINT fk_inspections_reservation FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
        echo "✓ table inspections créée\n";
        $changes++;
    }

    // 6. Espace agence : rôles propriétaire / employé, 2FA, sessions, journal d'activité
    $roleType = (string) $pdo->query("SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'role'")->fetchColumn();
    if (!str_contains($roleType, "'owner'")) {
        $pdo->exec("ALTER TABLE users MODIFY COLUMN role ENUM('owner', 'employee', 'client', 'admin') NOT NULL DEFAULT 'client'");
        echo "✓ users.role : rôles propriétaire et employé\n";
        $changes++;
    }
    $n = $pdo->exec("UPDATE users SET role = 'owner' WHERE role = 'admin'");
    if ($n > 0) {
        echo "✓ {$n} compte(s) admin devenu(s) propriétaire\n";
        $changes++;
    }
    $userColumns = [
        'active'               => 'TINYINT(1) NOT NULL DEFAULT 1',
        'must_change_password' => 'TINYINT(1) NOT NULL DEFAULT 0',
        'agency'               => 'VARCHAR(100) NULL',
        'totp_secret'          => 'VARCHAR(64) NULL',
        'totp_enabled'         => 'TINYINT(1) NOT NULL DEFAULT 0',
        'recovery_codes'       => 'TEXT NULL',
        'token_version'        => 'INT NOT NULL DEFAULT 0',
        'last_login_at'        => 'DATETIME NULL',
        'last_activity_at'     => 'DATETIME NULL',
    ];
    foreach ($userColumns as $column => $definition) {
        if (!$hasColumn('users', $column)) {
            $pdo->exec("ALTER TABLE users ADD COLUMN {$column} {$definition}");
            echo "✓ users.{$column} ajoutée\n";
            $changes++;
        }
    }
    if (!$hasTable('audit_logs')) {
        $pdo->exec("CREATE TABLE audit_logs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NULL,
            user_name VARCHAR(100) NULL,
            action VARCHAR(60) NOT NULL,
            entity_type VARCHAR(30) NULL,
            entity_id INT NULL,
            details TEXT NULL,
            ip VARCHAR(45) NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_audit_entity (entity_type, entity_id),
            INDEX idx_audit_user (user_id),
            INDEX idx_audit_created (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
        echo "✓ table audit_logs créée (journal d'activité)\n";
        $changes++;
    }

    // 7. Mot de passe oublié : liens de réinitialisation (30 min, usage unique)
    if (!$hasTable('password_resets')) {
        $pdo->exec("CREATE TABLE password_resets (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            token_hash CHAR(64) NOT NULL,
            expires_at DATETIME NOT NULL,
            used_at DATETIME NULL,
            ip VARCHAR(45) NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uniq_reset_token (token_hash),
            INDEX idx_reset_user (user_id),
            CONSTRAINT fk_reset_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
        echo "✓ table password_resets créée (mot de passe oublié)\n";
        $changes++;
    }

    // 8. Sécurité : statut « refusée », compteur de tentatives, code à 6 chiffres à usage unique
    $statusType = (string) $pdo->query("SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'reservations' AND COLUMN_NAME = 'status'")->fetchColumn();
    if ($statusType !== '' && !str_contains($statusType, "'rejected'")) {
        $pdo->exec("ALTER TABLE reservations MODIFY COLUMN status ENUM('pending', 'confirmed', 'rejected', 'cancelled') NOT NULL DEFAULT 'pending'");
        echo "✓ reservations.status : ajout de « rejected » (refusée)\n";
        $changes++;
    }
    if (!$hasTable('login_attempts')) {
        $pdo->exec("CREATE TABLE login_attempts (
            id INT AUTO_INCREMENT PRIMARY KEY,
            identifier VARCHAR(255) NOT NULL UNIQUE,
            attempts INT NOT NULL DEFAULT 0,
            last_attempt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_last_attempt (last_attempt)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
        echo "✓ table login_attempts créée (limitation des tentatives de connexion)\n";
        $changes++;
    }
    if (!$hasColumn('users', 'totp_last_slice')) {
        $pdo->exec("ALTER TABLE users ADD COLUMN totp_last_slice INT NULL AFTER totp_enabled");
        echo "✓ users.totp_last_slice ajoutée (un code à 6 chiffres ne sert qu'une fois)\n";
        $changes++;
    }

    echo $changes === 0 ? "Schéma déjà à jour.\n" : "Schéma mis à jour ({$changes} changement(s)).\n";
} catch (Throwable $e) {
    fwrite(STDERR, 'Migration error: ' . $e->getMessage() . "\n");
    exit(1);
}
