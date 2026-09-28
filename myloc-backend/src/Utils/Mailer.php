<?php

declare(strict_types=1);

namespace Myloc\Utils;

/**
 * Envoi d'e-mails sans dépendance.
 *
 * .env :
 *   MAIL_DRIVER=log   → (par défaut) chaque e-mail est enregistré dans logs/mails/*.html
 *                       pour le développement, rien n'est envoyé.
 *   MAIL_DRIVER=smtp  → envoi réel via SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS,
 *                       SMTP_SECURE=tls (STARTTLS, port 587) ou ssl (port 465).
 *   MAIL_FROM, MAIL_FROM_NAME : expéditeur.
 *
 * Un e-mail qui échoue ne bloque jamais l'action (réservation, etc.) : l'erreur est journalisée.
 */
class Mailer
{
    public static function send(string $to, string $subject, string $html, ?string $replyTo = null): bool
    {
        if (!filter_var($to, FILTER_VALIDATE_EMAIL)) {
            return false;
        }
        $driver = strtolower($_ENV['MAIL_DRIVER'] ?? 'log');
        try {
            if ($driver === 'smtp') {
                self::smtp($to, $subject, $html, $replyTo);
            } else {
                self::log($to, $subject, $html);
            }
            return true;
        } catch (\Throwable $e) {
            error_log('Mail to ' . $to . ' failed: ' . $e->getMessage());
            return false;
        }
    }

    private static function fromAddress(): string
    {
        return $_ENV['MAIL_FROM'] ?? ($_ENV['SMTP_USER'] ?? 'no-reply@myloc.dz');
    }

    private static function fromName(): string
    {
        return $_ENV['MAIL_FROM_NAME'] ?? 'MYLOC.DZ';
    }

    private static function log(string $to, string $subject, string $html): void
    {
        $dir = __DIR__ . '/../../logs/mails';
        if (!is_dir($dir) && !mkdir($dir, 0775, true) && !is_dir($dir)) {
            throw new \RuntimeException('Cannot create ' . $dir);
        }
        $slug = preg_replace('/[^a-z0-9]+/', '-', strtolower(iconv('UTF-8', 'ASCII//TRANSLIT', $subject) ?: 'mail'));
        $file = sprintf('%s/%s_%s.html', $dir, date('Ymd-His'), trim((string) $slug, '-'));
        $header = sprintf(
            "<!-- À : %s | Objet : %s | %s -->\n<div style=\"font:13px monospace;background:#fffbe6;padding:8px 12px;border-bottom:1px solid #eee\">À : %s — Objet : %s</div>\n",
            $to, $subject, date('c'), htmlspecialchars($to), htmlspecialchars($subject)
        );
        file_put_contents($file, $header . $html);
        error_log("[mail] {$to} — {$subject} → logs/mails/" . basename($file));
    }

    private static function smtp(string $to, string $subject, string $html, ?string $replyTo): void
    {
        $host = $_ENV['SMTP_HOST'] ?? '';
        $port = (int) ($_ENV['SMTP_PORT'] ?? 587);
        $secure = strtolower($_ENV['SMTP_SECURE'] ?? ($port === 465 ? 'ssl' : 'tls'));
        $user = $_ENV['SMTP_USER'] ?? '';
        $pass = $_ENV['SMTP_PASS'] ?? '';
        if ($host === '') {
            throw new \RuntimeException('SMTP_HOST manquant dans .env');
        }

        $remote = ($secure === 'ssl' ? 'ssl://' : 'tcp://') . $host . ':' . $port;
        $socket = @stream_socket_client($remote, $errno, $errstr, 10, STREAM_CLIENT_CONNECT, stream_context_create());
        if (!$socket) {
            throw new \RuntimeException("Connexion SMTP impossible ({$errstr})");
        }
        stream_set_timeout($socket, 10);

        $read = function () use ($socket): string {
            $data = '';
            while (($line = fgets($socket, 515)) !== false) {
                $data .= $line;
                if (strlen($line) < 4 || $line[3] === ' ') {
                    break;
                }
            }
            return $data;
        };
        $cmd = function (?string $command, array $expect) use ($socket, $read): string {
            if ($command !== null) {
                fwrite($socket, $command . "\r\n");
            }
            $reply = $read();
            $code = (int) substr($reply, 0, 3);
            if (!in_array($code, $expect, true)) {
                $shown = $command !== null && str_starts_with($command, 'AUTH') ? 'AUTH' : (string) $command;
                throw new \RuntimeException("SMTP {$shown} → " . trim($reply));
            }
            return $reply;
        };

        $ehloHost = gethostname() ?: 'localhost';
        $cmd(null, [220]);
        $cmd('EHLO ' . $ehloHost, [250]);
        if ($secure === 'tls') {
            $cmd('STARTTLS', [220]);
            if (!stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
                throw new \RuntimeException('STARTTLS a échoué');
            }
            $cmd('EHLO ' . $ehloHost, [250]);
        }
        if ($user !== '') {
            $cmd('AUTH LOGIN', [334]);
            $cmd(base64_encode($user), [334]);
            $cmd(base64_encode($pass), [235]);
        }

        $from = self::fromAddress();
        $cmd('MAIL FROM:<' . $from . '>', [250]);
        $cmd('RCPT TO:<' . $to . '>', [250, 251]);
        $cmd('DATA', [354]);

        $encode = fn(string $s) => '=?UTF-8?B?' . base64_encode($s) . '?=';
        $headers = [
            'Date: ' . date('r'),
            'From: ' . $encode(self::fromName()) . ' <' . $from . '>',
            'To: <' . $to . '>',
            'Subject: ' . $encode($subject),
            'Message-ID: <' . bin2hex(random_bytes(12)) . '@' . (explode('@', $from)[1] ?? 'myloc.dz') . '>',
            'MIME-Version: 1.0',
            'Content-Type: text/html; charset=UTF-8',
            'Content-Transfer-Encoding: base64',
        ];
        if ($replyTo && filter_var($replyTo, FILTER_VALIDATE_EMAIL)) {
            $headers[] = 'Reply-To: <' . $replyTo . '>';
        }
        $body = implode("\r\n", $headers) . "\r\n\r\n" . rtrim(chunk_split(base64_encode($html), 76, "\r\n"));
        fwrite($socket, $body . "\r\n.\r\n");
        $cmd(null, [250]);
        $cmd('QUIT', [221]);
        fclose($socket);
    }
}
