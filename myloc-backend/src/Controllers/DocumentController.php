<?php

declare(strict_types=1);

namespace Myloc\Controllers;

use Myloc\Config\Database;
use Myloc\Middleware\AuthMiddleware;
use Myloc\Utils\Response;
use Myloc\Utils\Validator;

/**
 * Documents d'identité du client (passeport, permis de conduire) : obligatoires
 * avant toute réservation en ligne. Fichiers PRIVÉS — stockés hors du docroot
 * (/var/www/html/documents, jamais servis par Apache ni Nginx) et relus
 * uniquement par GET /api/documents/{id}/file, réservé au client propriétaire
 * ou à l'équipe de l'agence.
 */
class DocumentController
{
    private const TYPES = ['passeport', 'permis'];
    /** MIME réellement vérifié par finfo, jamais par l'extension du nom du fichier. */
    private const ALLOWED_MIMES = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp',
        'application/pdf' => 'pdf',
    ];
    private const MAX_SIZE = 5 * 1024 * 1024; // 5 Mo

    private const FILENAME_PATTERN = '#^documents/(passeport|permis)-[a-f0-9]{16}\.(jpg|png|webp|pdf)$#';

    /** Dossier /var/www/html/documents : hors du docroot public/. */
    private const DIR = __DIR__ . '/../../documents';

    private \PDO $pdo;

    public function __construct(Database $db)
    {
        $this->pdo = $db->getPdo();
    }

    /** Les documents du client connecté (métadonnées uniquement). */
    public function listMine(): void
    {
        $user = AuthMiddleware::requireClient();
        Response::success('Vos documents.', ['documents' => $this->rowsFor((int) $user['user_id'])]);
    }

    /** Téléversement (ou remplacement) d'un document : type + fichier multipart. */
    public function upload(): void
    {
        $user = AuthMiddleware::requireClient();
        $type = Validator::sanitizeString($_POST['type'] ?? '');
        if (!in_array($type, self::TYPES, true)) {
            Response::error('Type de document invalide.', 422);
        }

        if (empty($_FILES['file'])) {
            Response::error('Aucun fichier reçu.', 422);
        }
        $file = $_FILES['file'];
        if ($file['error'] !== UPLOAD_ERR_OK) {
            $msg = match ($file['error']) {
                UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE => 'Fichier trop lourd (5 Mo maximum).',
                UPLOAD_ERR_PARTIAL => 'Envoi interrompu, réessayez.',
                UPLOAD_ERR_NO_FILE => 'Aucun fichier reçu.',
                default => 'Le serveur n\'a pas pu enregistrer le document.',
            };
            Response::error($msg, 400);
        }

        $finfo = new \finfo(FILEINFO_MIME_TYPE);
        $mimeType = $finfo->file($file['tmp_name']);
        $ext = self::ALLOWED_MIMES[$mimeType] ?? null;
        if ($ext === null) {
            Response::error('Format non accepté (JPG, PNG, WEBP ou PDF).', 422);
        }
        if ($file['size'] > self::MAX_SIZE) {
            Response::error('Fichier trop lourd (5 Mo maximum).', 422);
        }

        if (!is_dir(self::DIR) && !mkdir(self::DIR, 0755, true) && !is_dir(self::DIR)) {
            Response::error('Impossible d\'enregistrer le document.', 500);
        }

        // Chemin du nouveau fichier, sans lien avec le nom d'origine (jamais dans une URL de système de fichiers).
        $filename = 'documents/' . $type . '-' . bin2hex(random_bytes(8)) . '.' . $ext;
        $targetPath = self::DIR . '/' . basename($filename);
        if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
            error_log('[documents] move_uploaded_file a échoué pour ' . $filename);
            Response::error('Le serveur n\'a pas pu enregistrer le document.', 500);
        }

        // Remplacement : l'ancien fichier ne saute qu'après l'installation du nouveau,
        // pour ne jamais laisser le client sans document accepté en cas d'erreur.
        $stmt = $this->prepare('SELECT filename FROM user_documents WHERE user_id = :uid AND type = :type');
        $stmt->execute([':uid' => $user['user_id'], ':type' => $type]);
        $old = $stmt->fetchColumn();
        if (is_string($old) && $old !== '' && preg_match(self::FILENAME_PATTERN, $old)) {
            @unlink(__DIR__ . '/../../' . $old);
        }

        $stmt = $this->prepare('INSERT INTO user_documents (user_id, type, filename, original_name, mime, size_bytes)
            VALUES (:uid, :type, :filename, :original_name, :mime, :size)
            ON DUPLICATE KEY UPDATE filename = VALUES(filename), original_name = VALUES(original_name),
                mime = VALUES(mime), size_bytes = VALUES(size_bytes), uploaded_at = CURRENT_TIMESTAMP');
        $stmt->execute([
            ':uid' => $user['user_id'],
            ':type' => $type,
            ':filename' => $filename,
            ':original_name' => Validator::sanitizeString($file['name'] ?? '') ?: null,
            ':mime' => $mimeType,
            ':size' => (int) $file['size'],
        ]);

        Response::success('Document enregistré.', ['documents' => $this->rowsFor((int) $user['user_id'])]);
    }

    /** Équipe : documents d'un client (pour le tiroir de réservation). */
    public function listForUser(): void
    {
        AuthMiddleware::requireStaff();
        $userId = filter_var($_GET['user_id'] ?? '', FILTER_VALIDATE_INT);
        if ($userId === false || $userId <= 0) {
            Response::error('Client invalide.', 422);
        }
        Response::success('Documents du client.', ['documents' => $this->rowsFor($userId)]);
    }

    /** Relecture du fichier : client propriétaire ou équipe de l'agence. */
    public function streamFile(array $params): void
    {
        $user = AuthMiddleware::requireAuth();
        $id = filter_var($params['id'] ?? '', FILTER_VALIDATE_INT);
        if ($id === false || $id <= 0) {
            Response::error('Document introuvable.', 404);
        }

        $stmt = $this->prepare('SELECT * FROM user_documents WHERE id = :id LIMIT 1');
        $stmt->execute([':id' => $id]);
        $doc = $stmt->fetch();
        if (!$doc || (!AuthMiddleware::isStaffRole((string) $user['role']) && (int) $doc['user_id'] !== (int) $user['user_id'])) {
            // 404 plutôt que 403 : ne pas confirmer l'existence des documents d'autrui.
            Response::error('Document introuvable.', 404);
        }
        if (!preg_match(self::FILENAME_PATTERN, (string) $doc['filename']) || !is_file(__DIR__ . '/../../' . $doc['filename'])) {
            Response::error('Document introuvable.', 404);
        }

        // Nom lisible à l'arrivée : version ASCII (les anciens clients) + RFC 5987 (accents/arabe).
        $safe = (string) ($doc['original_name'] ?? '');
        $ascii = $safe !== '' && preg_match('/^[\x20-\x7E]{1,160}$/', $safe) ? $safe : ($doc['type'] . '-' . $doc['id'] . '.' . basename($doc['filename']));
        header('Content-Type: ' . (string) $doc['mime']);
        header('Content-Length: ' . (string) $doc['size_bytes']);
        header('Cache-Control: no-store');
        header('Content-Disposition: inline; filename="' . str_replace('"', '', $ascii) . '"; filename*=UTF-8\'\'' . rawurlencode($safe !== '' ? $safe : $ascii));
        header('X-Content-Type-Options: nosniff');
        readfile(__DIR__ . '/../../' . $doc['filename']);
        exit;
    }

    private function prepare(string $sql): \PDOStatement
    {
        return $this->pdo->prepare($sql);
    }

    /** Métadonnées (jamais le contenu) : listes côté client et côté équipe. */
    private function rowsFor(int $userId): array
    {
        $stmt = $this->prepare('SELECT id, type, filename, original_name, mime, size_bytes, uploaded_at
            FROM user_documents WHERE user_id = :uid ORDER BY type');
        $stmt->execute([':uid' => $userId]);
        return $stmt->fetchAll() ?: [];
    }
}
