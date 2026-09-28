<?php

declare(strict_types=1);

namespace Myloc\Services;

use Myloc\Config\Database;
use Myloc\Utils\Mailer;

/**
 * Tous les e-mails envoyés par MYLOC (même mise en page).
 *
 * .env : FRONTEND_URL (ex. https://myloc.dz), PAGE_SUFFIX (« .html » pour le site exporté,
 * vide en développement), AGENCY_NOTIFY_EMAIL (sinon les propriétaires actifs), CURRENCY, AGENCY_PHONE.
 */
class Emails
{
    public static function pageLink(string $page, array $query = []): string
    {
        $base = rtrim($_ENV['FRONTEND_URL'] ?? 'http://localhost:3001', '/');
        $suffix = $_ENV['PAGE_SUFFIX'] ?? '';
        return $base . '/' . $page . $suffix . ($query ? '?' . http_build_query($query) : '');
    }

    public static function reference(int $id): string
    {
        return 'MYL-' . str_pad((string) $id, 6, '0', STR_PAD_LEFT);
    }

    private static function e(?string $s): string
    {
        return htmlspecialchars((string) $s, ENT_QUOTES, 'UTF-8');
    }

    private static function money($amount): string
    {
        $currency = $_ENV['CURRENCY'] ?? '€';
        return number_format((float) $amount, 0, ',', ' ') . ' ' . $currency;
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

    private static function firstName(?string $name): string
    {
        return explode(' ', trim((string) $name))[0] ?: 'Bonjour';
    }

    /** Gabarit commun : en-tête bleu nuit, carte blanche, bouton, pied de page. */
    private static function layout(string $title, string $body, ?array $button = null, string $footer = ''): string
    {
        $btn = $button
            ? '<p style="margin:28px 0 8px"><a href="' . self::e($button[1]) . '" style="display:inline-block;background:#43b0e6;color:#0b1f3a;font-weight:800;text-decoration:none;padding:14px 26px;border-radius:999px">' . self::e($button[0]) . '</a></p>'
            : '';
        $phone = $_ENV['AGENCY_PHONE'] ?? '';
        $contact = $phone !== '' ? ' · ' . self::e($phone) : '';
        return '<!doctype html><html lang="fr"><body style="margin:0;background:#eef4f8;font-family:Montserrat,Helvetica,Arial,sans-serif;color:#1d2b3a">'
            . '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef4f8;padding:24px 12px"><tr><td align="center">'
            . '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">'
            . '<tr><td style="background:#0b1f3a;border-radius:20px 20px 0 0;padding:22px 28px;color:#fff;font-weight:900;font-size:20px;letter-spacing:.5px">MYLOC<span style="color:#43b0e6">.DZ</span></td></tr>'
            . '<tr><td style="background:#fff;border-radius:0 0 20px 20px;padding:30px 28px 26px;font-size:15px;line-height:1.6">'
            . '<h1 style="margin:0 0 14px;font-size:22px;color:#0b1f3a">' . self::e($title) . '</h1>'
            . $body . $btn
            . ($footer !== '' ? '<p style="margin:22px 0 0;font-size:13px;color:#6b7c8f">' . $footer . '</p>' : '')
            . '</td></tr>'
            . '<tr><td style="padding:16px 8px;text-align:center;font-size:12px;color:#8a99a8">MYLOC.DZ — Location de voitures' . $contact . '</td></tr>'
            . '</table></td></tr></table></body></html>';
    }

    /** Tableau récapitulatif d'une réservation. */
    private static function summary(array $r): string
    {
        $rows = [
            ['Référence', self::reference((int) $r['id'])],
            ['Véhicule', $r['car_name'] ?? ''],
            ['Départ', trim(self::date($r['start_date']) . ' ' . substr((string) ($r['pickup_time'] ?? ''), 0, 5) . ($r['pickup_place'] ? ' · ' . $r['pickup_place'] : ''))],
            ['Retour', trim(self::date($r['end_date']) . ' ' . substr((string) ($r['return_time'] ?? ''), 0, 5) . ($r['return_place'] ? ' · ' . $r['return_place'] : ''))],
            ['Total', self::money($r['total_price'] ?? 0)],
        ];
        $html = '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0;border:1px solid #e3ebf2;border-radius:14px;border-collapse:separate;overflow:hidden">';
        foreach ($rows as $i => [$label, $value]) {
            if ($value === '') {
                continue;
            }
            $bg = $i % 2 ? '#fff' : '#f6f9fc';
            $html .= '<tr><td style="background:' . $bg . ';padding:10px 14px;font-size:13px;color:#6b7c8f;width:38%">' . self::e($label)
                . '</td><td style="background:' . $bg . ';padding:10px 14px;font-weight:700;color:#0b1f3a">' . self::e($value) . '</td></tr>';
        }
        return $html . '</table>';
    }

    // ───────────────────────── Mot de passe ─────────────────────────

    public static function passwordReset(array $user, string $link, bool $staff): void
    {
        $body = '<p>Bonjour ' . self::e(self::firstName($user['full_name'])) . ',</p>'
            . '<p>Vous avez demandé à changer le mot de passe de votre compte ' . ($staff ? '<b>espace agence</b>' : 'MYLOC') . '. Cliquez sur le bouton ci-dessous pour en choisir un nouveau.</p>'
            . '<p style="font-size:13px;color:#6b7c8f">Ce lien est valable <b>30 minutes</b> et ne fonctionne qu\'une seule fois.</p>';
        $footer = 'Vous n\'êtes pas à l\'origine de cette demande ? Ignorez cet e-mail : votre mot de passe reste inchangé.'
            . ($staff ? ' Votre code à 6 chiffres (double authentification) restera demandé à la connexion.' : '');
        Mailer::send($user['email'], 'Réinitialisez votre mot de passe MYLOC', self::layout('Nouveau mot de passe', $body, ['Choisir un nouveau mot de passe', $link], $footer));
    }

    public static function passwordChanged(array $user): void
    {
        $body = '<p>Bonjour ' . self::e(self::firstName($user['full_name'])) . ',</p>'
            . '<p>Le mot de passe de votre compte MYLOC vient d\'être modifié (' . date('d/m/Y à H:i') . '). Par sécurité, toutes vos sessions ouvertes ont été fermées.</p>';
        Mailer::send($user['email'], 'Votre mot de passe a été modifié', self::layout('Mot de passe modifié', $body, null,
            'Ce n\'était pas vous ? Contactez l\'agence immédiatement.'));
    }

    // ───────────────────────── Réservations ─────────────────────────

    /** Adresses de l'agence qui reçoivent les nouvelles demandes. */
    private static function agencyRecipients(): array
    {
        $configured = array_filter(array_map('trim', explode(',', $_ENV['AGENCY_NOTIFY_EMAIL'] ?? '')));
        if ($configured) {
            return $configured;
        }
        $stmt = Database::shared()->getPdo()->query("SELECT email FROM users WHERE role IN ('owner','admin') AND active = 1");
        return $stmt->fetchAll(\PDO::FETCH_COLUMN) ?: [];
    }

    /** Nouvelle demande en ligne : alerte à l'agence + accusé de réception au client. */
    public static function newReservation(array $r): void
    {
        $body = '<p><b>' . self::e($r['full_name']) . '</b> vient de demander une réservation sur le site.</p>'
            . self::summary($r)
            . '<p style="font-size:14px">📞 ' . self::e($r['phone']) . ($r['email'] ? ' · ✉️ ' . self::e($r['email']) : '') . '</p>'
            . ($r['client_note'] ? '<p style="font-size:14px;background:#f6f9fc;border-radius:12px;padding:10px 14px">« ' . self::e($r['client_note']) . ' »</p>' : '');
        $html = self::layout('Nouvelle demande de réservation', $body, ['Ouvrir l\'espace agence', self::pageLink('agence')],
            'Pensez à confirmer ou refuser rapidement : le client attend votre réponse.');
        foreach (self::agencyRecipients() as $to) {
            Mailer::send($to, 'Nouvelle réservation ' . self::reference((int) $r['id']) . ' · ' . ($r['car_name'] ?? ''), $html, $r['email'] ?: null);
        }

        // Accusé de réception envoyé à l'adresse du compte client,
        // pas à l'adresse saisie librement dans le formulaire : on ne peut pas s'en servir pour
        // envoyer des e-mails MYLOC à un tiers.
        $clientEmail = !empty($r['user_id']) ? ($r['user_email'] ?? null) : ($r['email'] ?? null);
        if (!empty($clientEmail)) {
            $body = '<p>Bonjour ' . self::e(self::firstName($r['full_name'])) . ',</p>'
                . '<p>Nous avons bien reçu votre demande. L\'agence la vérifie et vous répond au plus vite : vous recevrez un e-mail dès qu\'elle sera confirmée.</p>'
                . self::summary($r);
            Mailer::send($clientEmail, 'Demande reçue · ' . self::reference((int) $r['id']),
                self::layout('Demande bien reçue', $body, ['Suivre ma réservation', self::pageLink('client')]));
        }
    }

    /** Le client a annulé lui-même : l'agence est prévenue (la voiture est de nouveau libre). */
    public static function clientCancelled(array $r, string $previousStatus): void
    {
        $body = '<p><b>' . self::e($r['full_name']) . '</b> a annulé sa réservation'
            . ($previousStatus === 'confirmed' ? ' <b>confirmée</b>' : '') . ' depuis son espace client. Le véhicule est de nouveau disponible sur ces dates.</p>'
            . self::summary($r);
        $html = self::layout('Réservation annulée par le client', $body, ['Ouvrir l\'espace agence', self::pageLink('agence')]);
        foreach (self::agencyRecipients() as $to) {
            Mailer::send($to, 'Annulation client ' . self::reference((int) $r['id']) . ' · ' . ($r['car_name'] ?? ''), $html, $r['email'] ?: null);
        }
    }

    /** Réponse de l'agence : confirmée, refusée ou annulée. */
    public static function reservationStatus(array $r, string $status): void
    {
        if (empty($r['email']) || !in_array($status, ['confirmed', 'rejected', 'cancelled'], true)) {
            return;
        }
        $name = self::e(self::firstName($r['full_name']));
        $note = trim((string) ($r['admin_note'] ?? ''));
        $noteHtml = $note !== ''
            ? '<p style="font-size:14px;background:#f6f9fc;border-left:4px solid #43b0e6;border-radius:8px;padding:10px 14px"><b>Message de l\'agence :</b><br>' . nl2br(self::e($note)) . '</p>'
            : '';
        $ref = self::reference((int) $r['id']);

        if ($status === 'confirmed') {
            $body = '<p>Bonjour ' . $name . ',</p><p>Bonne nouvelle : votre réservation est <b style="color:#0f8a5f">confirmée</b> ! Votre voiture vous attend.</p>'
                . self::summary($r) . $noteHtml
                . '<p style="font-size:14px">Le jour du départ, munissez-vous de votre <b>permis de conduire</b> et d\'une <b>pièce d\'identité</b>.</p>';
            Mailer::send($r['email'], 'Réservation confirmée ✅ ' . $ref, self::layout('Réservation confirmée', $body, ['Voir ma réservation', self::pageLink('client')]));
            return;
        }

        $word = $status === 'rejected' ? 'n\'a pas pu être acceptée' : 'a été annulée';
        $body = '<p>Bonjour ' . $name . ',</p><p>Nous sommes désolés : votre réservation ' . $word . '.</p>'
            . self::summary($r) . $noteHtml
            . '<p>D\'autres véhicules sont peut-être disponibles sur vos dates.</p>';
        Mailer::send($r['email'], ($status === 'rejected' ? 'Réservation non acceptée · ' : 'Réservation annulée · ') . $ref,
            self::layout($status === 'rejected' ? 'Réservation non acceptée' : 'Réservation annulée', $body, ['Voir les voitures disponibles', rtrim($_ENV['FRONTEND_URL'] ?? 'http://localhost:3001', '/') . '/#vehicules']));
    }
}
