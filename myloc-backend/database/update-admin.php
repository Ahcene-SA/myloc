<?php
/**
 * Mise à jour d'un compte de l'équipe (propriétaire ou employé) directement en base :
 * email et/ou mot de passe — la fiche « Mon compte » ne permet de changer que le
 * profil, et l'entrée ADMIN_EMAIL/ADMIN_PASSWORD ne sert qu'au premier lancement.
 *
 * Usage (depuis une machine qui parle au conteneur backend) :
 *   docker exec -it <backend> php database/update-admin.php
 *
 * Le script liste les comptes propriétaire/employé, demande lequel modifier, puis :
 * - email (Entrée = inchangé) : contrôle de forme et d'unicité ;
 * - mot de passe (Entrée = inchangé) : saisie cachée, 8 caractères minimum,
 *   haché en bcrypt coût 12 comme dans l'application ;
 * - si le mot de passe change, les sessions ouvertes sont révoquées
 *   (token_version) — la 2FA et les codes de secours restent en place.
 *
 * Garder l'onglet Environment de Dokploy d'accord (ADMIN_EMAIL / ADMIN_PASSWORD) :
 * ces variables ne servent qu'au premier lancement, mais rester justes évite
 * les surprises lors d'une remise à zéro.
 */

$env = parse_ini_file(__DIR__ . '/../.env');
$pdo = new PDO(
    sprintf('mysql:host=%s;dbname=%s;charset=utf8mb4', $env['DB_HOST'], $env['DB_NAME']),
    $env['DB_USER'],
    $env['DB_PASS'],
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
);

$byId = [];
foreach ($pdo->query("SELECT id, email, role, active FROM users WHERE role IN ('owner', 'employee') ORDER BY id") as $row) {
    $byId[(int) $row['id']] = $row;
}
if (!$byId) {
    fwrite(STDERR, "Aucun compte propriétaire/employé en base.\n");
    exit(1);
}
echo "Comptes de l'équipe :\n";
foreach ($byId as $u) {
    printf("  #%d  %s  (%s%s)\n", $u['id'], $u['email'], $u['role'] === 'owner' ? 'propriétaire' : 'employé', $u['active'] ? '' : ' · désactivé');
}

// Compte à modifier : Entrée = le seul compte propriétaire
$who = null;
while ($who === null) {
    fwrite(STDOUT, "Compte à modifier (id, Entrée = le propriétaire) : ");
    $line = trim((string) fgets(STDIN));
    if ($line === '') {
        $owners = array_values(array_filter($byId, fn($u) => $u['role'] === 'owner'));
        if (count($owners) === 1) {
            $who = $owners[0];
        } else {
            fwrite(STDERR, "Il y a " . count($owners) . " comptes propriétaires : précisez un id.\n");
        }
    } else {
        // « #1 » dans la liste : on accepte « 1 » comme « #1 » (ainsi que l'email complet).
        $idOrEmail = ltrim($line, '#');
        $who = $byId[(int) $idOrEmail] ?? null;
        if ($who === null) {
            foreach ($byId as $u) {
                if (strcasecmp($u['email'], $idOrEmail) === 0) {
                    $who = $u;
                    break;
                }
            }
        }
        if ($who === null) {
            echo "Id inconnu. Choix possibles : " . implode(', ', array_map(fn($u) => '#' . $u['id'], $byId)) . "\n";
        }
    }
}

// Nouvel email (Entrée = inchangé)
fwrite(STDOUT, "Nouvel email (Entrée = inchangé) : ");
$email = trim((string) fgets(STDIN));
if ($email !== '') {
    if (!filter_var($email, FILTER_VALIDATE_EMAIL) || mb_strlen($email) > 255) {
        fwrite(STDERR, "Email invalide.\n");
        exit(1);
    }
    $dup = $pdo->prepare('SELECT id FROM users WHERE email = :email AND id != :id');
    $dup->execute([':email' => $email, ':id' => $who['id']]);
    if ($dup->fetch()) {
        fwrite(STDERR, "Cet email est déjà pris par un autre compte.\n");
        exit(1);
    }
}

// Nouveau mot de passe (Entrée = inchangé), caché tant qu'on tape dans un vrai terminal
fwrite(STDOUT, "Nouveau mot de passe (Entrée = inchangé, 8 caractères min.) : ");
$echoed = false;
if (function_exists('posix_isatty') && @posix_isatty(STDIN)) {
    exec('stty -echo');
    $echoed = true;
}
$password = trim((string) fgets(STDIN));
if ($password !== '') {
    // Saisie unique et cachée : on la fait confirmer, une coquille sinon verrouille le compte.
    fwrite(STDOUT, "Confirmation du mot de passe : ");
    $confirm = trim((string) fgets(STDIN));
    if ($echoed) {
        exec('stty echo');
        echo "\n";
    }
    if ($confirm !== $password) {
        fwrite(STDERR, "Les deux saisies ne concordent pas : rien n'a été modifié.\n");
        exit(1);
    }
} elseif ($echoed) {
    exec('stty echo');
    echo "\n";
}

$sets = [];
$args = [':id' => $who['id']];
if ($email !== '') {
    $sets[] = 'email = :email';
    $args[':email'] = $email;
}
if ($password !== '') {
    if (mb_strlen($password) < 8) {
        fwrite(STDERR, "Le mot de passe doit contenir au moins 8 caractères.\n");
        exit(1);
    }
    $sets[] = 'password_hash = :hash';
    $args[':hash'] = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
    // Les jetons déjà délivrés cessent d'être acceptés : personne ne reste connecté
    // avec l'ancien mot de passe.
    $sets[] = 'token_version = token_version + 1';
}
if (!$sets) {
    echo "Rien à modifier.\n";
    exit(0);
}

$stmt = $pdo->prepare('UPDATE users SET ' . implode(', ', $sets) . ' WHERE id = :id');
$stmt->execute($args);

$changed = [];
if (isset($args[':email'])) {
    $changed[] = "email → {$args[':email']}";
}
if (isset($args[':hash'])) {
    $changed[] = 'mot de passe changé (sessions révoquées, 2FA inchangée)';
}
echo "Compte #{$who['id']} mis à jour : " . implode(' ; ', $changed) . ".\n";
echo "Pensez à mettre ADMIN_EMAIL (et ADMIN_PASSWORD) au même niveau dans Dokploy : ils ne servent qu'au premier lancement, mais rester justes évite les surprises.\n";