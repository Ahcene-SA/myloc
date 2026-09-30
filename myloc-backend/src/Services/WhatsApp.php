<?php

declare(strict_types=1);

namespace Myloc\Services;

/**
 * Alerte WhatsApp à l'agence quand une réservation arrive depuis le site.
 *
 * .env :
 *   WHATSAPP_DRIVER=log    → (par défaut) le message est enregistré dans logs/whatsapp/*.txt,
 *                            rien n'est envoyé : utile pour vérifier le texte avant l'envoi réel.
 *   WHATSAPP_DRIVER=meta   → API Cloud WhatsApp officielle (Meta) : création d'un compte
 *                            Meta Business + numéro « WhatsApp Business Platform », puis
 *                            WHATSAPP_TOKEN (jeton d'accès permanent) et WHATSAPP_PHONE_ID
 *                            (numéro expéditeur Meta). Un template est indispensable pour un
 *                            message initié par l'agence : créer un template « utility » dont
 *                            le corps contient une variable {{1}} (le texte complet de
 *                            l'alerte est passé comme paramètre). Nom du template :
 *                            WHATSAPP_TEMPLATE (défaut « reservation »), langue WHATSAPP_LANG
 *                            (défaut « fr »).
 *   WHATSAPP_DRIVER=callmebot → service non officiel de test rapide : sur
 *                            https://api.callmebot.com/whatsapp.php suivre la procédure avec
 *                            le numéro de l'agence, récupérer l'API key, la mettre dans
 *                            WHATSAPP_APIKEY.
 *   WHATSAPP_TO            → numéro WhatsApp qui reçoit l'alerte, au format international
 *                            (213 + le reste, sans 0 initial, ex. 213560550590). S'il est vide,
 *                            le code reprend AGENCY_PHONE. C'est le téléphone personnel de
 *                            l'agence : le numéro enregistré chez Meta (expéditeur) doit être un
 *                            autre numéro, sinon on s'enverrait un message à soi-même.
 *
 * Comme les e-mails : un échec d'envoi ne bloque jamais la réservation, il est journalisé.
 */
class WhatsApp
{
    /** Version de l'API Graph en vigueur (Meta publie une nouvelle version chaque trimestre). */
    private const GRAPH_VERSION = 'v21.0';

    public static function newReservation(array $r): void
    {
        $message = self::reservationText($r);
        $to = self::agencyNumber();
        $driver = strtolower(trim((string) ($_ENV['WHATSAPP_DRIVER'] ?? 'log')));
        try {
            if ($driver === 'meta') {
                if ($to === null) {
                    throw new \RuntimeException('WHATSAPP_TO absent (ou AGENCY_PHONE invalide) : numéro du destinataire introuvable.');
                }
                self::meta($to, $message);
            } elseif ($driver === 'callmebot') {
                if ($to === null) {
                    throw new \RuntimeException('WHATSAPP_TO absent (ou AGENCY_PHONE invalide) : numéro du destinataire introuvable.');
                }
                self::callmebot($to, $message);
            } else {
                self::log($message);
            }
        } catch (\Throwable $e) {
            error_log('[whatsapp] Envoi à ' . ($to ?? 'destinataire non configuré') . ' impossible : ' . $e->getMessage());
            // On retombe sur le log : l'alerte n'est jamais perdue, même quand l'envoi échoue.
            self::log($message);
        }
    }

    /** Texte de l'alerte : informations réservation + client (gras = mise en forme WhatsApp). */
    private static function reservationText(array $r): string
    {
        $lines = [];
        $lines[] = '🚗 *Nouvelle réservation ' . self::reference((int) $r['id']) . '*';
        $lines[] = '';
        $lines[] = 'Véhicule : *' . ($r['car_name'] ?? '-') . '*' . (isset($r['car_price_per_day']) ? ' · ' . self::money($r['car_price_per_day']) . '/j' : '');
        $lines[] = 'Départ : ' . self::date($r['start_date'] ?? null) . (isset($r['pickup_time']) && $r['pickup_time'] ? ' à ' . substr($r['pickup_time'], 0, 5) : '')
            . (isset($r['pickup_place']) && $r['pickup_place'] ? ' — ' . $r['pickup_place'] : '');
        $lines[] = 'Retour : ' . self::date($r['end_date'] ?? null) . (isset($r['return_time']) && $r['return_time'] ? ' à ' . substr($r['return_time'], 0, 5) : '')
            . (isset($r['return_place']) && $r['return_place'] ? ' — ' . $r['return_place'] : '');
        $lines[] = 'Total : *' . self::money($r['total_price'] ?? 0) . '*';
        if (!empty($r['payment_method'])) {
            $labels = ['especes' => 'espèces', 'carte' => 'carte', 'virement' => 'virement'];
            $lines[] = 'Paiement : ' . ($labels[$r['payment_method']] ?? $r['payment_method']);
        }
        $lines[] = '';
        $lines[] = '👤 Client : *' . ($r['full_name'] ?? '-') . '*';
        $lines[] = '📞 ' . ($r['phone'] ?? '');
        if (!empty($r['email'])) {
            $lines[] = '✉️ ' . $r['email'];
        }
        // Réservation faite par un visiteur (pas de compte client demandé par l'agence)
        if (empty($r['user_id']) && !empty($r['user_email'])) {
            $lines[] = 'Compte client : ' . $r['user_email'];
        }
        if (!empty($r['client_note'])) {
            $lines[] = '📝 « ' . $r['client_note'] . ' »';
        }
        $lines[] = '';
        $lines[] = '⏳ Demande en attente — à confirmer dans l\'espace agence.';
        return implode("\n", $lines);
    }

    /** Numéro du destinataire en chiffres internationaux (pas de « + »), ou null. */
    private static function agencyNumber(): ?string
    {
        $raw = trim((string) ($_ENV['WHATSAPP_TO'] ?? '')) ?: trim((string) ($_ENV['AGENCY_PHONE'] ?? ''));
        if ($raw === '') {
            return null;
        }
        $digits = preg_replace('/[^0-9]/', '', $raw);
        return $digits !== '' ? $digits : null;
    }

    // ───────────────────────── Pilotes ─────────────────────────

    /** Pilote meta : envoi du template avec le texte comme paramètre du corps. */
    private static function meta(string $to, string $message): void
    {
        $token = trim((string) ($_ENV['WHATSAPP_TOKEN'] ?? ''));
        $phoneId = trim((string) ($_ENV['WHATSAPP_PHONE_ID'] ?? ''));
        if ($token === '' || $phoneId === '') {
            throw new \RuntimeException('WHATSAPP_TOKEN / WHATSAPP_PHONE_ID manquants dans .env');
        }
        self::post('https://graph.facebook.com/' . self::GRAPH_VERSION . '/' . $phoneId . '/messages', [
            'messaging_product' => 'whatsapp',
            'to' => $to,
            'type' => 'template',
            'template' => [
                'name' => trim((string) ($_ENV['WHATSAPP_TEMPLATE'] ?? 'reservation')) ?: 'reservation',
                'language' => ['code' => trim((string) ($_ENV['WHATSAPP_LANG'] ?? 'fr')) ?: 'fr'],
                'components' => [[
                    'type' => 'body',
                    'parameters' => [['type' => 'text', 'text' => $message]],
                ]],
            ],
        ], $token);
    }

    /** Pilote callmebot (service de test non officiel). */
    private static function callmebot(string $to, string $message): void
    {
        $apikey = trim((string) ($_ENV['WHATSAPP_APIKEY'] ?? ''));
        if ($apikey === '') {
            throw new \RuntimeException('WHATSAPP_APIKEY manquant dans .env');
        }
        self::get('https://api.callmebot.com/whatsapp.php?' . http_build_query([
            'phone' => '+' . $to,
            'text' => $message,
            'apikey' => $apikey,
        ]));
    }

    /** Copie locale du message, comme les e-mails en MAIL_DRIVER=log. */
    private static function log(string $message): void
    {
        $dir = __DIR__ . '/../../logs/whatsapp';
        if (!is_dir($dir) && !mkdir($dir, 0775, true) && !is_dir($dir)) {
            throw new \RuntimeException('Cannot create ' . $dir);
        }
        $file = sprintf('%s/%s_%s.txt', $dir, date('Ymd-His'), bin2hex(random_bytes(3)));
        file_put_contents($file, $message . "\n");
        error_log('[whatsapp] Message enregistré → logs/whatsapp/' . basename($file));
    }

    // ───────────────────────── HTTP + aides ─────────────────────────

    private static function post(string $url, array $payload, string $token): void
    {
        $body = json_encode($payload, JSON_UNESCAPED_UNICODE);
        if ($body === false) {
            throw new \RuntimeException('Encodage JSON du message impossible.');
        }
        $curl = curl_init($url);
        if (!$curl) {
            throw new \RuntimeException('Impossible d\'initialiser cURL.');
        }
        curl_setopt_array($curl, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $body,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 15,
            CURLOPT_HTTPHEADER => [
                'Authorization: Bearer ' . $token,
                'Content-Type: application/json',
            ],
        ]);
        $response = curl_exec($curl);
        $status = (int) curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
        $error = curl_error($curl);
        curl_close($curl);
        if ($response === false) {
            throw new \RuntimeException('cURL : ' . ($error !== '' ? $error : 'échec'));
        }
        if ($status >= 300) {
            throw new \RuntimeException('HTTP ' . $status . ' : ' . mb_substr((string) $response, 0, 200));
        }
    }

    private static function get(string $url): void
    {
        $curl = curl_init($url);
        if (!$curl) {
            throw new \RuntimeException('Impossible d\'initialiser cURL.');
        }
        curl_setopt_array($curl, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 15,
        ]);
        $response = curl_exec($curl);
        $status = (int) curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
        $error = curl_error($curl);
        curl_close($curl);
        if ($response === false) {
            throw new \RuntimeException('cURL : ' . ($error !== '' ? $error : 'échec'));
        }
        if ($status >= 300) {
            throw new \RuntimeException('HTTP ' . $status . ' : ' . mb_substr((string) $response, 0, 200));
        }
    }

    private static function reference(int $id): string
    {
        return 'MYL-' . str_pad((string) $id, 6, '0', STR_PAD_LEFT);
    }

    private static function money($amount): string
    {
        return number_format((float) $amount, 0, ',', ' ') . ' ' . ($_ENV['CURRENCY'] ?? 'DA');
    }

    private static function date(?string $d): string
    {
        if (!$d) {
            return '';
        }
        $months = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
        $t = strtotime($d);
        return $t ? date('j', $t) . ' ' . $months[(int) date('n', $t) - 1] . ' ' . date('Y', $t) : $d;
    }
}