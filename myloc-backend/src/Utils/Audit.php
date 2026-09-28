<?php

declare(strict_types=1);

namespace Myloc\Utils;

use Myloc\Config\Database;
use Myloc\Middleware\AuthMiddleware;

/** Journal d'activité de l'équipe : qui a fait quoi, quand. */
class Audit
{
    /**
     * @param array<string, mixed> $details
     * @param array{user_id:int, name:?string}|null $actor par défaut l'utilisateur de la requête
     */
    public static function log(string $action, ?string $entityType = null, ?int $entityId = null, array $details = [], ?array $actor = null): void
    {
        try {
            $actor ??= AuthMiddleware::current();
            $pdo = Database::shared()->getPdo();
            $name = $actor['name'] ?? null;
            if ($actor && $name === null) {
                $st = $pdo->prepare('SELECT full_name FROM users WHERE id = :id');
                $st->execute([':id' => $actor['user_id']]);
                $name = $st->fetchColumn() ?: null;
            }
            $stmt = $pdo->prepare('INSERT INTO audit_logs (user_id, user_name, action, entity_type, entity_id, details, ip)
                VALUES (:uid, :uname, :action, :etype, :eid, :details, :ip)');
            $stmt->execute([
                ':uid' => $actor['user_id'] ?? null,
                ':uname' => $name,
                ':action' => $action,
                ':etype' => $entityType,
                ':eid' => $entityId,
                ':details' => $details ? json_encode($details, JSON_UNESCAPED_UNICODE) : null,
                ':ip' => substr(ClientIp::get(), 0, 45) ?: null,
            ]);
        } catch (\Throwable $e) {
            // Le journal ne doit jamais bloquer l'action elle-même
            error_log('Audit log failed: ' . $e->getMessage());
        }
    }
}
