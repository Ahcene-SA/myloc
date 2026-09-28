<?php
/**
 * Flotte réelle de MYLOC.DZ (grille « Nos tarifs », prix en DA / jour).
 *
 * Usage : php myloc-backend/database/flotte.php
 * - met à jour les véhicules existants (reconnus par leur nom, y compris les anciens noms) ;
 * - ajoute ceux qui manquent ;
 * - ne supprime rien : les véhicules qui ne sont pas dans la liste sont seulement signalés.
 * Relançable sans risque.
 */

require __DIR__ . '/../vendor/autoload.php';

use Myloc\Config\Database;

Dotenv\Dotenv::createImmutable(__DIR__ . '/..')->safeLoad();
\Myloc\Config\Timezone::apply();

// [catégorie, nom, prix/jour DA, boîte, places, année, image, description, anciens noms]
$fleet = [
    ['citadine', 'Fiat 500',          7500,  'manuel',      4, 2025, 'fiat-500.webp',         null, []],
    ['citadine', 'Citroën C3',        9000,  'automatique', 5, 2025, 'citroen-c3.png',        null, ['Citroen C3']],
    ['suv',      'Fiat 500X',         11000, 'automatique', 5, 2025, 'fiat-500x.webp',        null, []],
    ['citadine', 'Clio 5 Alpine',     12000, 'automatique', 5, 2025, 'clio5-alpine.webp',     null, ['Clio 5 Alpino', 'Clio V Alpine']],
    ['citadine', 'Clio 5 Techno',     12000, 'automatique', 5, 2025, 'clio5-techno.png',      null, ['Clio V Techno']],
    ['compacte', 'Opel Astra Grise',  14000, 'automatique', 5, 2025, 'opel-astra-grise.webp', 'Full options', ['Opel Astra']],
    ['compacte', 'Opel Astra Noire',  14000, 'automatique', 5, 2025, 'opel-astra-noir.webp',  'Full options', ['Opel Astra Noir']],
    ['suv',      'Opel Mokka',        15000, 'automatique', 5, 2025, 'opel-mokka.png',        null, ['Opel Mocca']],
    ['suv',      'Renault Captur',    15500, 'automatique', 5, 2025, 'renault-captur.png',    null, []],
    ['suv',      'Opel Grandland',    16000, 'automatique', 5, 2025, 'opel-grandland.webp',   null, []],
    ['compacte', 'Volkswagen Golf 8', 19000, 'automatique', 5, 2026, 'golf-8.webp',           null, ['Golf 8', 'VW Golf 8']],
    ['suv',      'Jetour X70 Plus',   20000, 'automatique', 7, 2026, 'jetour-x70-plus.png',   'SUV 7 places', ['Jetour X70+']],
];

try {
    $pdo = (new Database())->getPdo();
    $find = $pdo->prepare('SELECT id FROM cars WHERE LOWER(name) = LOWER(:name) LIMIT 1');
    $update = $pdo->prepare('UPDATE cars SET category = :category, name = :name, price_per_day = :price, transmission = :transmission,
        seats = :seats, year = :year, image_url = :image, description = COALESCE(:description, description) WHERE id = :id');
    $insert = $pdo->prepare("INSERT INTO cars (category, name, price_per_day, transmission, seats, year, image_url, description, status)
        VALUES (:category, :name, :price, :transmission, :seats, :year, :image, :description, 'available')");

    $kept = [];
    foreach ($fleet as [$category, $name, $price, $transmission, $seats, $year, $image, $description, $oldNames]) {
        $id = null;
        foreach (array_merge([$name], $oldNames) as $candidate) {
            $find->execute([':name' => $candidate]);
            $id = $find->fetchColumn() ?: null;
            if ($id) {
                break;
            }
        }
        $params = [
            ':category' => $category, ':name' => $name, ':price' => $price, ':transmission' => $transmission,
            ':seats' => $seats, ':year' => $year, ':image' => "images/cars/{$image}", ':description' => $description,
        ];
        if ($id) {
            $update->execute($params + [':id' => $id]);
            echo "✓ mis à jour : {$name} ({$price} DA/jour)\n";
        } else {
            $insert->execute($params);
            $id = (int) $pdo->lastInsertId();
            echo "✓ ajouté : {$name} ({$price} DA/jour)\n";
        }
        $kept[] = (int) $id;
    }

    $others = $pdo->query('SELECT id, name FROM cars WHERE id NOT IN (' . implode(',', $kept) . ')')->fetchAll();
    foreach ($others as $car) {
        echo "• hors grille (non modifié) : {$car['name']} — à retirer du site depuis l'espace agence si besoin\n";
    }
    echo "Flotte à jour : " . count($kept) . " véhicules.\n";
} catch (Throwable $e) {
    fwrite(STDERR, 'Erreur : ' . $e->getMessage() . "\n");
    exit(1);
}
