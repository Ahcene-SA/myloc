<?php

declare(strict_types=1);

namespace Myloc\Services;

/**
 * Alerte WhatsApp à l'agence quand une réservation arrive depuis le site.
 *
 * .env :
 *   WHATSAPP_DRIVER=log    → (par défaut) le message est enregistré dans logs/whatsapp/*.txt,
 *                            rien n'est envoyé : utile pour vérifier le texte avant l'envoi réel.
 *   WHATSAPP_DRIVER=meta   → API Cloud WhatsApp officielle (Meta) : créer un compte
 *                            Meta Business et un numéro « WhatsApp Business Platform », puis
 *                            WHATSAPP_TOKEN (jeton d'accès permanent) et WHATSAPP_PHONE_ID
 *                            (numéro expéditeur Meta). Un template est indispensable pour un
 *                            message initié par l'agence : créer un template « utility » de
 *                            nom WHATSAPP_TEMPLATE (défaut « reservation ») et de langue
 *                            WHATSAPP_LANG (défaut « fr »), dont le corps est exactement :
 *
 *                            🚗 *Nouvelle réservation {{1}}*
 *
 *                            {{2}}
 *
 *                            {{1}} reçoit la référence, {{2}} le récapitulatif. La mise en
 *                            forme (gras, etc.) ne passe que dans le texte fixe du template :
 *                            le récapitulatif est envoyé sans astérisques. Meta plafonne à
 *                            1024 caractères — le code rogne la note du client pour rester
 *                            sous la limite. Le numéro Meta (expéditeur) doit être un autre
 *                            numéro que le téléphone de l'agence (destinataire).
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
    private const GRAPH_VERSION = 'v23.0';

    /** Limite Meta : chaque paramètre texte du corps de template est plafonné à 1024 caractères. */
    private const TEMPLATE_BODY_MAX = 1024;

    private const FOOTER = "\n\n⏳ Demande en attente — à confirmer dans l'espace agence.";

    public static function newReservation(array $r): void
    {
        $to = self::agencyNumber();
        $driver = strtolower(trim((string) ($_ENV['WHATSAPP_DRIVER'] ?? 'log')));
        try {
            if ($driver === 'meta') {
                if ($to === null) {
                    throw new \RuntimeException('WHATSAPP_TO absent (ou AGENCY_PHONE invalide) : numéro du destinataire introuvable.');
                }
                [$reference, $details] = self::reservationMetaParts($r);
                self::meta($to, $reference, $details);
            } elseif ($driver === 'callmebot') {
                if ($to === null) {
                    throw new \RuntimeException('WHATSAPP_TO absent (ou AGENCY_PHONE invalide) : numéro du destinataire introuvable.');
                }
                self::callmebot($to, self::reservationText($r));
            } else {
                self::log(self::reservationText($r));
            }
        } catch (\Throwable $e) {
            error_log('[whatsapp] Envoi à ' . ($to ?? 'destinataire non configuré') . ' impossible : ' . $e->getMessage());
            // On retombe sur le log : l'alerte n'est jamais perdue, même quand l'envoi échoue.
            self::log(self::reservationText($r));
        }
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

    // ───────────────────────── Textes ─────────────────────────

    /** Texte de l'alerte complet (avec en-tête et gras) — pilotes log et callmebot. */
    private static function reservationText(array $r): string
    {
        [$header, $details] = self::reservationParts($r, null, true);
        return $header . "\n\n" . $details;
    }

    /** [référence, récapitulatif sans en-tête ni gras] pour le template Meta.
     *  Le récapitulatif est rogné pour que le corps rendu du template (en-tête + {{2}})
     *  tienne dans la limite Meta de 1024 caractères. */
    private static function reservationMetaParts(array $r): array
    {
        $reference = self::reference((int) $r['id']);
        [$header, $details] = self::reservationParts($r, null, false);
        if (mb_strlen($header . "\n\n" . $details) + 2 > self::TEMPLATE_BODY_MAX) {
            // Seule la note du client est de longueur libre : on la raccourcit pour rentrer.
            // (+2 : les astérisques du gras, fixés autour de {{1}} dans le texte du template.)
            $budget = self::TEMPLATE_BODY_MAX - 2 - mb_strlen($header . "\n\n");
            [, $details] = self::reservationParts($r, $budget, false);
        }
        return [$reference, $details];
    }

    /** [en-tête, récapitulatif] ; $max = limite du récapitulatif (la note du client est rognée),
     *  $markdown = astérisques de gras du texte WhatsApp (absents du template Meta : Meta
     *  affiche littéralement le contenu des variables, la mise en forme reste au texte fixe). */
    private static function reservationParts(array $r, ?int $max, bool $markdown): array
    {
        $reference = self::reference((int) $r['id']);
        $header = '🚗 ' . self::bold('Nouvelle réservation ' . $reference, $markdown);

        $lines = [];
        $lines[] = 'Véhicule : ' . self::bold((string) ($r['car_name'] ?? '-'), $markdown) . (isset($r['car_price_per_day']) ? ' · ' . self::money($r['car_price_per_day']) . '/j' : '');
        $lines[] = 'Départ : ' . self::date($r['start_date'] ?? null) . (isset($r['pickup_time']) && $r['pickup_time'] ? ' à ' . substr($r['pickup_time'], 0, 5) : '')
            . (isset($r['pickup_place']) && $r['pickup_place'] ? ' — ' . $r['pickup_place'] : '');
        $lines[] = 'Retour : ' . self::date($r['end_date'] ?? null) . (isset($r['return_time']) && $r['return_time'] ? ' à ' . substr($r['return_time'], 0, 5) : '')
            . (isset($r['return_place']) && $r['return_place'] ? ' — ' . $r['return_place'] : '');
        $lines[] = 'Total : ' . self::bold(self::money($r['total_price'] ?? 0), $markdown);
        if (!empty($r['payment_method'])) {
            $labels = ['especes' => 'espèces', 'carte' => 'carte', 'virement' => 'virement'];
            $lines[] = 'Paiement : ' . ($labels[$r['payment_method']] ?? $r['payment_method']);
        }
        $lines[] = '';
        $lines[] = '👤 Client : ' . self::bold((string) ($r['full_name'] ?? '-'), $markdown);
        if (!empty($r['birth_date'])) {
            $lines[] = '🎂 Né(e) le : ' . self::date($r['birth_date']);
        }
        $lines[] = '📞 ' . ($r['phone'] ?? '');
        if (!empty($r['email'])) {
            $lines[] = '✉️ ' . $r['email'];
        }
        // Réservation faite par un visiteur (pas de compte client demandé par l'agence)
        if (empty($r['user_id']) && !empty($r['user_email'])) {
            $lines[] = 'Compte client : ' . $r['user_email'];
        }
        $details = implode("\n", $lines);

        // La note du client en dernier : c'est la seule ligne de longueur libre, donc
        // c'est elle qui cède si le récapitulatif dépasse le plafond Meta.
        $note = trim((string) ($r['client_note'] ?? ''));
        if ($note !== '') {
            $sep = $details === '' ? '' : "\n";
            if ($max !== null && mb_strlen($details . $sep . '📝 « ' . $note . ' »' . self::FOOTER) > $max) {
                $budget = $max - mb_strlen($details . $sep . '📝 «  »' . self::FOOTER);
                $note = $budget >= 30 ? self::ellipsize($note, $budget) : null;
            }
            if ($note !== null) {
                $details .= $sep . '📝 « ' . $note . ' »';
            }
        }
        $details .= self::FOOTER;
        return [$header, $details];
    }

    private static function bold(string $s, bool $markdown): string
    {
        return $markdown ? '*' . $s . '*' : $s;
    }

    /** Coupe au mot le plus proche et ajoute une ellipse. */
    private static function ellipsize(string $text, int $max): string
    {
        $cut = mb_substr($text, 0, $max - 1);
        $space = mb_strrpos($cut, ' ');
        return ($space !== false ? mb_substr($cut, 0, $space) : $cut) . '…';
    }

    // ───────────────────────── Pilotes ─────────────────────────

    /** Pilote meta : envoi du template {{1}} = référence, {{2}} = récapitulatif. */
    private static function meta(string $to, string $reference, string $details): void
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
                    'parameters' => [
                        ['type' => 'text', 'text' => $reference],
                        ['type' => 'text', 'text' => $details],
                    ],
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