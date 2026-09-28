<?php
/**
 * Dernier recours si le propriétaire a perdu son téléphone ET ses codes de secours.
 * Usage (sur le serveur) : php database/reset-2fa.php email@exemple.com
 * La double authentification sera redemandée à la prochaine connexion.
 */

declare(strict_types=1);

require __DIR__ . '/../vendor/autoload.php';

use Myloc\Config\Database;

$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/..');
$dotenv->safeLoad();
\Myloc\Config\Timezone::apply();

$email = strtolower(trim($argv[1] ?? ''));
if ($email === '') {
    fwrite(STDERR, "Usage : php database/reset-2fa.php email@exemple.com\n");
    exit(1);
}

$pdo = (new Database())->getPdo();
$stmt = $pdo->prepare("UPDATE users SET totp_secret = NULL, totp_enabled = 0, recovery_codes = NULL,
    token_version = token_version + 1 WHERE email = :email AND role IN ('owner', 'employee', 'admin')");
$stmt->execute([':email' => $email]);

if ($stmt->rowCount() === 0) {
    fwrite(STDERR, "Aucun compte de l'équipe avec cet email.\n");
    exit(1);
}
$pdo->prepare("INSERT INTO audit_logs (action, entity_type, details) VALUES ('2fa_reset_cli', 'user', :d)")
    ->execute([':d' => json_encode(['email' => $email])]);
echo "✓ Double authentification réinitialisée pour {$email}. Elle sera redemandée à la prochaine connexion.\n";
