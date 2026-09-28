/** Espace client : tableau de bord, réservation, paiements, profil, état des lieux. */
export const arClient: Record<string, string> = {
  // Barre latérale & mise en page
  "Espace client": "فضاء الزبائن",
  "Accueil": "الرئيسية",
  "Mes réservations": "حجوزاتي",
  "Paiements": "المدفوعات",
  "Mon profil": "ملفي الشخصي",
  "{n} à traiter": "{n} قيد المعالجة",
  "Vérification de votre session…": "جارٍ التحقق من جلستك…",

  // Blocs partagés
  "Impossible de charger vos données": "تعذّر تحميل بياناتك",
  "Remise": "تخفيض",
  "→": "←",
  "En attente": "قيد الانتظار",
  "Confirmée": "مؤكَّد",
  "Refusée": "مرفوض",
  "Annulée": "ملغى",
  "Espèces à la remise des clés": "نقدًا عند تسليم المفاتيح",
  "Carte bancaire à la remise des clés": "بالبطاقة البنكية عند تسليم المفاتيح",
  "Virement bancaire": "تحويل بنكي",
  "Bonjour MYLOC.DZ, au sujet de ma réservation {ref} ({car}, du {start} au {end}).":
    "مرحبًا MYLOC.DZ، بخصوص حجزي {ref} ({car}، من {start} إلى {end}).",

  // Accueil
  "Locations à venir": "الكراءات القادمة",
  "En attente de confirmation": "في انتظار التأكيد",
  "Total des locations confirmées": "مجموع الكراءات المؤكدة",
  "Bonjour": "مرحبًا",
  "Bonjour, {name}": "مرحبًا، {name}",
  "Nouvelle réservation": "حجز جديد",
  "Véhicule": "السيارة",
  "Prochaine location": "الكراء القادم",
  "Départ": "الانطلاق",
  "Contacter l'agence": "اتصل بالوكالة",
  "Aucune location prévue": "لا يوجد كراء مبرمج",
  "Choisissez un véhicule, vos dates et votre point de retrait : votre demande est envoyée à l'agence en quelques clics.":
    "اختر سيارة وتواريخك ومكان الاستلام: يصل طلبك إلى الوكالة ببضع نقرات.",
  "Réserver un véhicule": "احجز سيارة",
  "Dernières réservations": "آخر الحجوزات",
  "Tout voir": "عرض الكل",
  "Vous n'avez pas encore de réservation.": "ليس لديك أي حجز بعد.",

  // Mes réservations
  "Suivi": "المتابعة",
  "Filtrer": "تصفية",
  "À venir": "القادمة",
  "Terminées": "المنتهية",
  "Annulées / refusées": "الملغاة / المرفوضة",
  "Toutes": "الكل",
  "Aucune réservation": "لا توجد حجوزات",
  "Rien ici": "لا شيء هنا",
  "Vos demandes de location apparaîtront ici, avec leur statut.": "ستظهر طلبات الكراء هنا مع حالتها.",
  "Aucune réservation ne correspond à ce filtre.": "لا يوجد حجز يطابق هذا التصنيف.",
  "Annulation impossible.": "تعذّر الإلغاء.",
  "Retrait :": "الاستلام:",
  "Retour :": "الإرجاع:",
  "Message de l'agence :": "رسالة من الوكالة:",
  "Annuler cette réservation ? Cette action est définitive.": "إلغاء هذا الحجز؟ لا يمكن التراجع عن هذا الإجراء.",
  "Garder": "الاحتفاظ به",
  "Oui, annuler": "نعم، ألغِ",

  // Paiements
  "Facturation": "الفوترة",
  "À régler (locations à venir)": "للدفع (الكراءات القادمة)",
  "Locations terminées": "الكراءات المنتهية",
  "Aucun paiement n'est demandé en ligne. Le montant de chaque location se règle directement auprès de MYLOC.DZ, selon le moyen choisi lors de la réservation.":
    "لا يُطلب أي دفع عبر الإنترنت. يُدفع مبلغ كل كراء مباشرة لدى MYLOC.DZ، حسب الوسيلة المختارة عند الحجز.",
  "Détail par réservation": "التفاصيل حسب الحجز",
  "Vos réservations en attente ou confirmées apparaîtront ici avec leur montant.":
    "ستظهر هنا حجوزاتك قيد الانتظار أو المؤكدة مع مبالغها.",
  "Réservation": "الحجز",
  "Période": "المدة",
  "Paiement": "الدفع",
  "Statut": "الحالة",
  "Montant": "المبلغ",
  "À définir avec l'agence": "يُحدَّد مع الوكالة",
  "Espèces": "نقدًا",
  "À la remise des clés, à l'agence ou à la livraison.": "عند تسليم المفاتيح، في الوكالة أو عند التوصيل.",
  "Carte bancaire": "البطاقة البنكية",
  "À la remise des clés, sur le terminal de l'agence.": "عند تسليم المفاتيح، عبر جهاز الدفع في الوكالة.",
  "Virement": "التحويل",
  "Les coordonnées bancaires vous sont envoyées après confirmation.": "تُرسل إليك المعلومات البنكية بعد التأكيد.",

  // Profil
  "Compte": "الحساب",
  "Profil mis à jour.": "تم تحديث الملف الشخصي.",
  "Enregistrement impossible.": "تعذّر الحفظ.",
  "Le nouveau mot de passe doit contenir au moins 8 caractères.": "يجب أن تحتوي كلمة المرور الجديدة على 8 أحرف على الأقل.",
  "Les deux mots de passe ne correspondent pas.": "كلمتا المرور غير متطابقتين.",
  "Mot de passe modifié.": "تم تغيير كلمة المرور.",
  "Modification impossible.": "تعذّر التعديل.",
  "Client depuis le {date}": "زبون منذ {date}",
  "Informations personnelles": "المعلومات الشخصية",
  "Nom et prénom": "الاسم واللقب",
  "Email": "البريد الإلكتروني",
  "Pour changer d'email, contactez l'agence.": "لتغيير بريدك الإلكتروني، اتصل بالوكالة.",
  "Téléphone": "الهاتف",
  "Mot de passe": "كلمة المرور",
  "Actuel": "الحالية",
  "Nouveau": "الجديدة",
  "Confirmation": "التأكيد",
  "Changer le mot de passe": "تغيير كلمة المرور",

  // État des lieux
  "Erreur": "خطأ",
  "État des lieux": "معاينة السيارة",
  "L'état des lieux sera réalisé avec vous à la remise des clés.": "ستتم معاينة السيارة معك عند تسليم المفاتيح.",
  "Au départ": "عند الانطلاق",
  "Au retour": "عند الإرجاع",
  "Pas encore réalisé.": "لم تتم بعد.",
  "Kilométrage :": "عدد الكيلومترات:",
  "km": "كلم",
  "Carrosserie vue de dessus": "هيكل السيارة من الأعلى",
  "AVANT": "الأمام",
  "dommage signalé": "ضرر مُسجَّل",
  "Dommage intérieur signalé": "ضرر داخلي مُسجَّل",
  "Niveau de carburant": "مستوى الوقود",
  "V": "ف",
  "P": "م",
  "Pare-chocs avant": "الواقي الأمامي",
  "Capot": "غطاء المحرك",
  "Pare-brise": "الزجاج الأمامي",
  "Toit": "السقف",
  "Pare-chocs arrière": "الواقي الخلفي",
  "Coffre": "الصندوق الخلفي",
  "Côté gauche": "الجانب الأيسر",
  "Côté droit": "الجانب الأيمن",
  "Jantes / pneus": "الجنوط / العجلات",
  "Intérieur": "الداخل",

  // Réserver : étapes et validation
  "Dates & lieux": "التواريخ والأماكن",
  "Conducteur": "السائق",
  "Tous": "الكل",
  "Choisissez un véhicule.": "اختر سيارة.",
  "Indiquez vos dates de départ et de retour.": "حدّد تاريخي الانطلاق والإرجاع.",
  "La date de départ ne peut pas être dans le passé.": "لا يمكن أن يكون تاريخ الانطلاق في الماضي.",
  "La date de retour doit être après la date de départ.": "يجب أن يكون تاريخ الإرجاع بعد تاريخ الانطلاق.",
  "La location en ligne est limitée à {max} jours. Contactez-nous pour une longue durée.":
    "الكراء عبر الإنترنت محدود بـ {max} يومًا. اتصل بنا للكراء طويل المدة.",
  "Ce véhicule est déjà réservé sur une partie de ces dates.": "هذه السيارة محجوزة في جزء من هذه التواريخ.",
  "Indiquez l'adresse de livraison.": "أدخل عنوان التوصيل.",
  "Indiquez l'adresse de récupération.": "أدخل عنوان الاستلام.",
  "Indiquez le nom du conducteur.": "أدخل اسم السائق.",
  "Adresse email invalide.": "البريد الإلكتروني غير صالح.",
  "Indiquez un numéro de téléphone.": "أدخل رقم هاتف.",
  "Indiquez le numéro de permis de conduire.": "أدخل رقم رخصة السياقة.",
  "Confirmez que le conducteur a un permis valide.": "أكّد أن السائق يملك رخصة سياقة صالحة.",
  "Cochez la case de confirmation pour envoyer la demande.": "ضع علامة في خانة التأكيد لإرسال الطلب.",
  "L'envoi a échoué, réessayez.": "فشل الإرسال، حاول مرة أخرى.",

  // Réserver : confirmation
  "Demande envoyée": "تم إرسال الطلب",
  "Merci {name} !": "شكرًا {name}!",
  "Votre demande {ref} pour la {car} du {start} au {end} est en attente de confirmation par l'agence. Vous suivrez son statut dans « Mes réservations ».":
    "طلبك {ref} لسيارة {car} من {start} إلى {end} في انتظار تأكيد الوكالة. يمكنك متابعة حالته في « حجوزاتي ».",
  "Voir mes réservations": "عرض حجوزاتي",
  "Prévenir l'agence sur WhatsApp": "أبلغ الوكالة عبر واتساب",

  // Réserver : formulaire
  "Aucun véhicule disponible": "لا توجد سيارة متاحة",
  "La flotte est vide pour le moment. Contactez l'agence sur WhatsApp.": "لا توجد سيارات حاليًا. اتصل بالوكالة عبر واتساب.",
  "Lieu de retrait": "مكان الاستلام",
  "Date": "التاريخ",
  "Heure": "الساعة",
  "Adresse de livraison": "عنوان التوصيل",
  "Rue, commune, wilaya": "الشارع، البلدية، الولاية",
  "Rendre le véhicule dans un autre lieu": "إرجاع السيارة في مكان آخر",
  "Lieu de retour": "مكان الإرجاع",
  "Adresse de récupération": "عنوان الاستلام",
  "Ces dates ne sont pas disponibles": "هذه التواريخ غير متاحة",
  "Périodes déjà réservées pour ce véhicule": "فترات محجوزة مسبقًا لهذه السيارة",
  "Du {start} au {end}": "من {start} إلى {end}",
  "Nom et prénom du conducteur": "اسم ولقب السائق",
  "Téléphone (WhatsApp de préférence)": "الهاتف (واتساب إن أمكن)",
  "Numéro de permis de conduire": "رقم رخصة السياقة",
  "Message pour l'agence (facultatif)": "رسالة إلى الوكالة (اختياري)",
  "Siège bébé, numéro de vol, heure d'arrivée…": "مقعد طفل، رقم الرحلة، ساعة الوصول…",
  "Je confirme que le conducteur est titulaire d'un permis de conduire valide et le présentera, avec une pièce d'identité, à la remise des clés.":
    "أؤكد أن السائق يحمل رخصة سياقة صالحة وسيقدّمها مع بطاقة هوية عند تسليم المفاتيح.",
  "Moyen de paiement": "وسيلة الدفع",
  "Aucun paiement en ligne : vous réglez directement auprès de l'agence.": "لا دفع عبر الإنترنت: تدفع مباشرة لدى الوكالة.",
  "Code promo": "رمز التخفيض",
  "Ex. : ETE26": "مثال: ETE26",
  "Appliquer": "تطبيق",
  "{date} à {time}": "{date} على الساعة {time}",
  "Livraison : {address}": "التوصيل: {address}",
  "Récupération : {address}": "الاستلام: {address}",
  "J'ai compris que ma demande doit être confirmée par l'agence MYLOC.DZ, et que le montant indiqué est réglé à la remise du véhicule.":
    "فهمت أن طلبي يجب أن تؤكده وكالة MYLOC.DZ، وأن المبلغ المذكور يُدفع عند استلام السيارة.",
  "Envoyer ma demande": "أرسل طلبي",

  // Réserver : récapitulatif
  "Aucun véhicule choisi": "لم يتم اختيار أي سيارة",
  "Récapitulatif": "الملخص",
  "Tarif": "السعر",
  "Durée": "المدة",
  "Prix de base": "السعر الأساسي",
  "Total": "المجموع",
  "Fidélité : encore {n} location terminée pour profiter de -{percent} % sur vos prochaines réservations.":
    "الوفاء: بقي {n} كراء منتهٍ للاستفادة من تخفيض {percent}% على حجوزاتك القادمة.",
  "Fidélité : encore {n} locations terminées pour profiter de -{percent} % sur vos prochaines réservations.":
    "الوفاء: بقيت {n} كراءات منتهية للاستفادة من تخفيض {percent}% على حجوزاتك القادمة.",
  "Prix final, assurance et assistance incluses. Réglé à la remise des clés.":
    "السعر نهائي، التأمين والمساعدة مشمولان. يُدفع عند تسليم المفاتيح.",

  // Réserver : étapes, prix, brouillon
  "Étape {n}/{total} · {label}": "الخطوة {n}/{total} · {label}",
  "Étapes de la réservation": "مراحل الحجز",
  "Prix à confirmer par l'agence": "السعر تؤكده الوكالة",

  // Mes réservations : demande restée sans réponse
  "Expirée": "منتهية",
  "L'agence n'a pas confirmé cette demande avant la date de départ. Contactez-la ou faites une nouvelle demande.":
    "لم تؤكد الوكالة هذا الطلب قبل تاريخ الانطلاق. اتصلوا بها أو قدّموا طلبًا جديدًا.",

  // État des lieux : photos
  "{title} : photo {n} sur {total} (nouvel onglet)": "{title}: الصورة {n} من {total} (علامة تبويب جديدة)",

  // Réseau
  "Impossible de joindre le serveur. Vérifiez votre connexion.": "تعذّر الاتصال بالخادم. تحقّق من اتصالك بالإنترنت.",

  // Messages du serveur visibles par le client
  "Email ou mot de passe invalide.": "البريد الإلكتروني أو كلمة المرور غير صالحة.",
  "Choisissez un mot de passe différent de l'actuel.": "اختر كلمة مرور مختلفة عن الحالية.",
  "Mot de passe modifié. Vos autres appareils ont été déconnectés.": "تم تغيير كلمة المرور. تم تسجيل خروج أجهزتك الأخرى.",
  "Route not found.": "الخدمة غير متاحة حاليًا. أعد المحاولة لاحقًا.",
  "Session fermée : reconnectez-vous.": "تم إغلاق الجلسة: سجّل الدخول من جديد.",
  "Connectez-vous depuis l'espace agence.": "سجّل الدخول من فضاء الوكالة.",
  "Montant trop élevé : contactez l'agence.": "المبلغ مرتفع جدًا: اتصلوا بالوكالة.",
  "Les réservations en ligne sont possibles jusqu'à 12 mois à l'avance.": "الحجز عبر الإنترنت ممكن حتى 12 شهرًا مسبقًا.",
  "Vous avez déjà 3 demandes en attente : attendez la réponse de l'agence avant d'en faire une autre.":
    "لديك بالفعل 3 طلبات قيد الانتظار: انتظر رد الوكالة قبل تقديم طلب آخر.",
};
