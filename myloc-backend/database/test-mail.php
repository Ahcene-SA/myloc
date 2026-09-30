<?php
/**
 * Vérifie l'envoi des e-mails avec la configuration du .env.
 * Usage : php myloc-backend/database/test-mail.php destinataire@exemple.com
 */

require __DIR__ . '/../vendor/autoload.php';

use Myloc\Utils\Mailer;

Dotenv\Dotenv::createImmutable(__DIR__ . '/..')->safeLoad();
\Myloc\Config\Timezone::apply();

$to = $argv[1] ?? '';
if (!filter_var($to, FILTER_VALIDATE_EMAIL)) {
    fwrite(STDERR, "Usage : php myloc-backend/database/test-mail.php destinataire@exemple.com\n");
    exit(1);
}

$driver = strtolower($_ENV['MAIL_DRIVER'] ?? 'log');
echo "Mode d'envoi : {$driver}" . ($driver === 'smtp' ? " ({$_ENV['SMTP_HOST']}:{$_ENV['SMTP_PORT']}, compte {$_ENV['SMTP_USER']})" : ' (enregistré dans logs/mails, rien n\'est envoyé)') . "\n";

// Les erreurs SMTP sont écrites par error_log : on les affiche ici
ini_set('log_errors', '1');
ini_set('error_log', 'php://stderr');

$html = '<p>Bonjour,</p><p>Ceci est un e-mail de test envoyé par le site <b>MYLOC.DZ</b> le ' . date('d/m/Y à H:i') . '.</p><p>Si vous le recevez, les e-mails automatiques fonctionnent.</p>';
if (Mailer::send($to, 'Test des e-mails MYLOC.DZ', $html)) {
    echo $driver === 'smtp' ? "✓ E-mail envoyé à {$to} (vérifiez aussi les courriers indésirables).\n" : "✓ E-mail enregistré dans myloc-backend/logs/mails.\n";
} else {
    fwrite(STDERR, "✗ Échec de l'envoi : voir le message ci-dessus.\n");
    exit(1);
}
