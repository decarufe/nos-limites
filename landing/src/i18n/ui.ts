export const languages = {
  fr: "Français",
  en: "English",
} as const;

export const defaultLang = "fr" as const;

export const ui = {
  fr: {
    // Navigation
    "nav.home": "Accueil",
    "nav.features": "Fonctionnalités",
    "nav.how": "Comment ça marche",
    "nav.faq": "FAQ",
    "nav.cta": "Commencer",

    // Footer
    "footer.privacy": "Confidentialité",
    "footer.legal": "Mentions légales",
    "footer.terms": "CGU",
    "footer.rights": "© 2026 Nos limites. Tous droits réservés.",
    "footer.tagline": "Le consentement mutuel, en toute confiance.",

    // Language
    "lang.switch": "English",

    // Hero
    "hero.title": "Le consentement mutuel, simplifié",
    "hero.subtitle":
      "Une application sécurisée pour explorer et définir ensemble les limites de ta relation. Parce que le consentement est la base de toute relation saine — seules les limites acceptées par les deux sont révélées.",
    "hero.cta": "Commencer gratuitement",
    "hero.cta.secondary": "Découvrir les fonctionnalités",

    // Consent section (home page)
    "consent.title": "Le consentement : pilier de toute relation",
    "consent.subtitle":
      'Le consentement n\'est pas un simple "oui" ou "non". C\'est un dialogue continu, éclairé et respectueux entre deux personnes.',
    "consent.block1.title": "Qu'est-ce que le consentement ?",
    "consent.block1.text":
      "Le consentement, c'est un accord libre, éclairé et mutuel. Il doit être donné sans pression, pouvoir être retiré à tout moment, et s'appliquer à chaque situation spécifique. Ce n'est pas l'absence de \"non\" — c'est la présence d'un \"oui\" enthousiaste.",
    "consent.block2.title": "Pourquoi c'est essentiel ?",
    "consent.block2.text":
      "Le consentement est le fondement du respect mutuel. Il protège l'intégrité et la dignité de chacun. Dans toute relation — professionnelle, amicale ou intime — poser et respecter les limites de l'autre renforce la confiance et crée un espace sûr pour s'épanouir.",
    "consent.block3.title": "Comment Nos limites aide ?",
    "consent.block3.text":
      "Notre système de match transforme la conversation sur le consentement en un processus bienveillant. Tu exprimes tes limites en toute confidentialité, et seules les limites mutuelles sont révélées. Zéro jugement, zéro pression — juste un dialogue ouvert et respectueux.",

    // Features highlights (home page)
    "highlights.title": "Pourquoi Nos limites ?",
    "highlights.subtitle":
      "Une approche unique et bienveillante pour explorer les limites de vos relations.",
    "highlight.match.title": "Système de match sécurisé",
    "highlight.match.desc":
      "Coche tes limites en privé. Seules celles acceptées par les deux personnes sont révélées — ta vulnérabilité est toujours protégée.",
    "highlight.qr.title": "Connexion instantanée",
    "highlight.qr.desc":
      "Affiche un QR code que ta relation peut scanner pour te rejoindre, ou partage un simple lien. Pas besoin de chercher dans un annuaire.",
    "highlight.categories.title": "5 catégories progressives",
    "highlight.categories.desc":
      "Du contact professionnel à l'intimité, explore un spectre complet de limites organisées en catégories illustrées.",
    "highlight.privacy.title": "Vie privée respectée",
    "highlight.privacy.desc":
      "Conforme RGPD, chiffrement des données, droit à l'oubli. Tes données t'appartiennent et tu peux les supprimer à tout moment.",

    // How it works (home summary)
    "steps.title": "Comment ça marche ?",
    "steps.subtitle":
      "Trois étapes simples pour découvrir vos limites communes.",
    "step.1.title": "Invite quelqu'un",
    "step.1.desc":
      "Affiche un QR code que l'autre peut scanner, ou partage un lien d'invitation. L'autre personne crée son compte gratuitement.",
    "step.2.title": "Coche tes limites",
    "step.2.desc":
      "Parcours les catégories et coche les comportements que tu acceptes. Tout reste confidentiel.",
    "step.3.title": "Découvre le match",
    "step.3.desc":
      "Seules les limites cochées par les deux personnes sont révélées. Ouvre le dialogue en toute sérénité.",

    // Features page
    "features.title": "Toutes les fonctionnalités",
    "features.subtitle":
      "Tout ce dont tu as besoin pour explorer tes relations en toute sécurité.",
    "feature.match.title": "Système de match",
    "feature.match.desc":
      "Coche tes limites en toute confidentialité. L'autre personne fait de même de son côté. Seules les limites cochées par les deux sont révélées — jamais tes choix individuels.",
    "feature.qr.title": "QR Code & lien d'invitation",
    "feature.qr.desc":
      "Affiche un QR code unique que ta relation peut scanner pour te rejoindre, ou partage un lien d'invitation. Un scan suffit pour être connectés.",
    "feature.categories.title": "5 catégories de limites",
    "feature.categories.desc":
      "Un spectre complet allant du professionnel à l'intime, avec des sous-catégories détaillées et des icônes illustratives.",
    "feature.cat.1": "🤝 Contact professionnel",
    "feature.cat.2": "😊 Contact amical",
    "feature.cat.3": "💬 Flirt et séduction",
    "feature.cat.4": "🤗 Contact rapproché",
    "feature.cat.5": "💕 Intimité",
    "feature.magiclink.title": "Connexion sans mot de passe",
    "feature.magiclink.desc":
      "Connecte-toi avec un simple lien envoyé par email. Pas de mot de passe à retenir, pas de risque de fuite.",
    "feature.notifications.title": "Notifications en temps réel",
    "feature.notifications.desc":
      "Reçois une notification quand une nouvelle limite commune est découverte ou quand quelqu'un t'invite.",
    "feature.pwa.title": "Application mobile",
    "feature.pwa.desc":
      "Installe l'application directement depuis ton navigateur. Pas besoin de passer par un store.",
    "feature.gdpr.title": "Conforme RGPD",
    "feature.gdpr.desc":
      "Tes données sont chiffrées, tu peux les exporter ou les supprimer à tout moment. Droit à l'oubli garanti.",
    "feature.notes.title": "Notes personnelles",
    "feature.notes.desc":
      "Ajoute des commentaires sur tes limites pour préciser tes préférences. Les notes sur les limites communes sont partagées.",

    // How it works page
    "how.title": "Comment ça marche",
    "how.subtitle":
      "Nos limites utilise un système de match pour protéger ta vulnérabilité tout en encourageant l'ouverture.",
    "how.step.1.title": "Crée ton profil",
    "how.step.1.desc":
      "Inscris-toi avec ton email — tu reçois un lien magique, pas besoin de mot de passe. Choisis un pseudo et une photo si tu le souhaites.",
    "how.step.2.title": "Invite quelqu'un",
    "how.step.2.desc":
      "Génère et affiche un QR code : ta relation le scanne pour rejoindre ta liste. Tu peux aussi partager un lien à distance. L'autre personne crée son compte et vous êtes connectés.",
    "how.step.3.title": "Coche tes limites",
    "how.step.3.desc":
      "Parcours les 5 catégories et coche les comportements que tu acceptes de l'autre personne. Tes choix restent strictement confidentiels.",
    "how.step.4.title": "Découvre les limites communes",
    "how.step.4.desc":
      "Seules les limites cochées par les deux personnes sont révélées. Tu ne sauras jamais ce que l'autre a coché si ce n'est pas réciproque — et vice versa.",
    "how.privacy.title": "Pourquoi ce système ?",
    "how.privacy.desc":
      "Le système de match encourage l'honnêteté. Tu peux cocher librement sans crainte de jugement, car seules les limites mutuelles sont visibles. C'est un espace sûr pour explorer ta relation.",

    // FAQ
    "faq.title": "Questions fréquentes",
    "faq.subtitle": "Tout ce que tu veux savoir sur Nos limites.",
    "faq.q1": "C'est quoi Nos limites ?",
    "faq.a1":
      "Nos limites est une application web qui permet à deux personnes de définir mutuellement les limites de leur relation. Chaque personne coche indépendamment les comportements qu'elle accepte, et seules les limites cochées par les deux sont révélées.",
    "faq.q2": "Est-ce que l'autre personne voit ce que j'ai coché ?",
    "faq.a2":
      "Non, jamais. Tes choix individuels restent strictement confidentiels. Seules les limites que vous avez TOUS LES DEUX cochées sont révélées. Si tu coches quelque chose mais pas l'autre personne, elle ne le saura pas.",
    "faq.q3": "Comment fonctionne le système de match ?",
    "faq.a3":
      "C'est comme un \"match\" : chaque personne coche ses limites de son côté. L'application compare ensuite les deux listes et ne révèle que les éléments en commun. Ce système protège ta vulnérabilité.",
    "faq.q4": "Mes données sont-elles en sécurité ?",
    "faq.a4":
      "Oui. Tes données de limites sont chiffrées. L'application est conforme au RGPD : tu peux exporter ou supprimer toutes tes données à tout moment. Nous ne vendons jamais tes données.",
    "faq.q5": "Comment supprimer mon compte ?",
    "faq.a5":
      "Va dans les paramètres de ton profil et clique sur « Supprimer mon compte ». Toutes tes données personnelles, relations et limites seront définitivement effacées.",
    "faq.q6": "L'application est-elle gratuite ?",
    "faq.a6":
      "Oui, Nos limites est entièrement gratuit. Pas de frais cachés, pas d'abonnement.",
    "faq.q7": "Puis-je l'utiliser sans installer ?",
    "faq.a7":
      "Oui ! Nos limites fonctionne directement dans ton navigateur. Tu peux aussi l'installer comme une application native depuis ton navigateur pour un accès plus rapide.",
    "faq.q8": "Quel est le lien entre Nos limites et le consentement ?",
    "faq.a8":
      "Nos limites est un outil de consentement mutuel. Il permet à deux personnes d'exprimer leurs limites en toute confidentialité et de ne révéler que ce qui est accepté par les deux. C'est une façon moderne et bienveillante de pratiquer le consentement éclairé dans toute relation.",
    "faq.q9":
      "Est-ce que Nos limites remplace une conversation sur le consentement ?",
    "faq.a9":
      "Non, c'est un complément. Nos limites ouvre le dialogue en identifiant les limites communes, mais la communication reste essentielle. L'application est un point de départ pour des conversations plus profondes et plus honnêtes sur tes limites et celles de l'autre.",

    // CTA Banner
    "cta.title": "Prêt·e à explorer tes limites ?",
    "cta.subtitle":
      "Rejoins Nos limites gratuitement et commence à découvrir les limites communes de tes relations.",
    "cta.button": "Commencer maintenant",

    // Privacy page
    "privacy.title": "Politique de confidentialité",
    "privacy.intro":
      "La protection de tes données personnelles est une priorité pour Nos limites. Cette politique explique quelles données nous collectons, comment nous les utilisons et quels sont tes droits.",
    "privacy.collected.title": "Données collectées",
    "privacy.collected.text":
      "Nous collectons uniquement les données nécessaires au fonctionnement du service : adresse email (pour l'authentification), pseudo et photo de profil (optionnelle), données de limites (chiffrées), et données techniques de connexion.",
    "privacy.usage.title": "Utilisation des données",
    "privacy.usage.text":
      "Tes données sont utilisées exclusivement pour fournir le service Nos limites. Nous ne vendons ni ne partageons jamais tes données personnelles avec des tiers à des fins commerciales.",
    "privacy.security.title": "Sécurité",
    "privacy.security.text":
      "Les données de limites sont chiffrées au repos. Les communications sont protégées par HTTPS. L'accès aux données est strictement limité.",
    "privacy.rights.title": "Tes droits (RGPD)",
    "privacy.rights.text":
      "Tu as le droit d'accéder à tes données, de les rectifier, de les exporter et de les supprimer. Tu peux exercer ces droits directement depuis l'application ou en nous contactant.",
    "privacy.cookies.title": "Cookies",
    "privacy.cookies.text":
      "Nous utilisons uniquement des cookies techniques nécessaires au fonctionnement de l'application (session, authentification). Aucun cookie de suivi ou publicitaire n'est utilisé.",
    "privacy.retention.title": "Conservation des données",
    "privacy.retention.text":
      "Tes données sont conservées tant que ton compte est actif. En cas de suppression de compte, toutes les données personnelles sont définitivement effacées.",

    // Legal page
    "legal.title": "Mentions légales",
    "legal.editor.title": "Éditeur",
    "legal.editor.text":
      "Nos limites est un projet personnel. Pour toute question, contacte-nous via l'application.",
    "legal.hosting.title": "Hébergement",
    "legal.hosting.text":
      "L'application est hébergée par Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis.",
    "legal.ip.title": "Propriété intellectuelle",
    "legal.ip.text":
      "L'ensemble du contenu de ce site (textes, graphismes, logo, icônes) est protégé par le droit d'auteur. Toute reproduction sans autorisation est interdite.",

    // Terms page
    "terms.title": "Conditions Générales d'Utilisation",
    "terms.service.title": "Description du service",
    "terms.service.text":
      "Nos limites est une application web permettant à deux personnes de définir mutuellement les limites de leur relation via un système de match confidentiel.",
    "terms.obligations.title": "Obligations de l'utilisateur",
    "terms.obligations.text":
      "En utilisant le service, tu t'engages à : fournir une adresse email valide, ne pas utiliser le service à des fins malveillantes, respecter les autres utilisateurs, ne pas tenter d'accéder aux données d'autres utilisateurs.",
    "terms.acceptable.title": "Utilisation acceptable",
    "terms.acceptable.text":
      "Le service est destiné à un usage personnel et bienveillant. Tout usage abusif, harcèlement ou tentative de contournement de la sécurité est interdit et peut entraîner la suspension du compte.",
    "terms.liability.title": "Responsabilité",
    "terms.liability.text":
      "Le service est fourni « en l'état ». Nous nous efforçons d'assurer sa disponibilité mais ne garantissons pas un fonctionnement ininterrompu. Nous ne sommes pas responsables des dommages indirects liés à l'utilisation du service.",
    "terms.termination.title": "Résiliation",
    "terms.termination.text":
      "Tu peux supprimer ton compte à tout moment. Nous nous réservons le droit de suspendre un compte en cas de violation des présentes conditions.",
  },

  en: {
    // Navigation
    "nav.home": "Home",
    "nav.features": "Features",
    "nav.how": "How it works",
    "nav.faq": "FAQ",
    "nav.cta": "Get started",

    // Footer
    "footer.privacy": "Privacy",
    "footer.legal": "Legal notice",
    "footer.terms": "Terms of use",
    "footer.rights": "© 2026 Nos limites. All rights reserved.",
    "footer.tagline": "Mutual consent, with confidence.",

    // Language
    "lang.switch": "Français",

    // Hero
    "hero.title": "Mutual consent, simplified",
    "hero.subtitle":
      "A secure app for exploring and defining your relationship boundaries together. Because consent is the foundation of every healthy relationship — only limits accepted by both people are revealed.",
    "hero.cta": "Get started for free",
    "hero.cta.secondary": "Discover features",

    // Consent section (home page)
    "consent.title": "Consent: the pillar of every relationship",
    "consent.subtitle":
      'Consent is not a simple "yes" or "no." It\'s a continuous, informed, and respectful dialogue between two people.',
    "consent.block1.title": "What is consent?",
    "consent.block1.text":
      'Consent is a free, informed, and mutual agreement. It must be given without pressure, can be withdrawn at any time, and applies to each specific situation. It\'s not the absence of "no" — it\'s the presence of an enthusiastic "yes."',
    "consent.block2.title": "Why is it essential?",
    "consent.block2.text":
      "Consent is the foundation of mutual respect. It protects everyone's integrity and dignity. In any relationship — professional, friendly, or intimate — setting and respecting each other's boundaries builds trust and creates a safe space to thrive.",
    "consent.block3.title": "How does Nos limites help?",
    "consent.block3.text":
      "Our matching system transforms the consent conversation into a caring process. You express your limits in full confidentiality, and only mutual limits are revealed. Zero judgment, zero pressure — just open and respectful dialogue.",

    // Features highlights (home page)
    "highlights.title": "Why Nos limites?",
    "highlights.subtitle":
      "A unique and caring approach to exploring the boundaries of your relationships.",
    "highlight.match.title": "Secure matching system",
    "highlight.match.desc":
      "Check your limits privately. Only those accepted by both people are revealed — your vulnerability is always protected.",
    "highlight.qr.title": "Invitations",
    "highlight.qr.desc":
      "Display a QR code your contact can scan to join you, or share a simple link. No need to search through a directory.",
    "highlight.categories.title": "5 progressive categories",
    "highlight.categories.desc":
      "From professional contact to intimacy, explore a full spectrum of limits organized into illustrated categories.",
    "highlight.privacy.title": "Privacy respected",
    "highlight.privacy.desc":
      "GDPR compliant, encrypted data, right to be forgotten. Your data belongs to you and you can delete it at any time.",

    // How it works (home summary)
    "steps.title": "How it works",
    "steps.subtitle": "Three simple steps to discover your common boundaries.",
    "step.1.title": "Invite someone",
    "step.1.desc":
      "Display a QR code they can scan, or share an invitation link. The other person creates their free account.",
    "step.2.title": "Check your limits",
    "step.2.desc":
      "Browse categories and check the behaviors you accept. Everything stays confidential.",
    "step.3.title": "Discover the match",
    "step.3.desc":
      "Only limits checked by both people are revealed. Open dialogue with peace of mind.",

    // Features page
    "features.title": "All features",
    "features.subtitle":
      "Everything you need to explore your relationships safely.",
    "feature.match.title": "Matching system",
    "feature.match.desc":
      "Check your limits confidentially. The other person does the same. Only limits checked by both are revealed — never your individual choices.",
    "feature.qr.title": "Invitations",
    "feature.qr.desc":
      "Display a unique QR code your contact can scan to join your relations, or share an invitation link. One scan is all it takes to connect.",
    "feature.categories.title": "5 limit categories",
    "feature.categories.desc":
      "A complete spectrum from professional to intimate, with detailed subcategories and illustrative icons.",
    "feature.cat.1": "🤝 Professional contact",
    "feature.cat.2": "😊 Friendly contact",
    "feature.cat.3": "💬 Flirting",
    "feature.cat.4": "🤗 Close contact",
    "feature.cat.5": "💕 Intimacy",
    "feature.magiclink.title": "Passwordless login",
    "feature.magiclink.desc":
      "Log in with a simple link sent to your email. No password to remember, no risk of leaks.",
    "feature.notifications.title": "Real-time notifications",
    "feature.notifications.desc":
      "Get notified when a new common limit is discovered or when someone invites you.",
    "feature.pwa.title": "Mobile app",
    "feature.pwa.desc":
      "Install the app directly from your browser. No app store required.",
    "feature.gdpr.title": "GDPR compliant",
    "feature.gdpr.desc":
      "Your data is encrypted, you can export or delete it at any time. Right to be forgotten guaranteed.",
    "feature.notes.title": "Personal notes",
    "feature.notes.desc":
      "Add comments to your limits to specify your preferences. Notes on common limits are shared.",

    // How it works page
    "how.title": "How it works",
    "how.subtitle":
      "Nos limites uses a matching system to protect your vulnerability while encouraging openness.",
    "how.step.1.title": "Create your profile",
    "how.step.1.desc":
      "Sign up with your email — you receive a magic link, no password needed. Choose a nickname and photo if you wish.",
    "how.step.2.title": "Invite someone",
    "how.step.2.desc":
      "Generate and display a QR code: your contact scans it to join your list. Or share a link remotely. The other person creates their account and you're connected.",
    "how.step.3.title": "Check your limits",
    "how.step.3.desc":
      "Browse the 5 categories and check the behaviors you accept from the other person. Your choices remain strictly confidential.",
    "how.step.4.title": "Discover common limits",
    "how.step.4.desc":
      "Only limits checked by both people are revealed. You'll never know what the other person checked unless it's mutual — and vice versa.",
    "how.privacy.title": "Why this system?",
    "how.privacy.desc":
      "The matching system encourages honesty. You can check freely without fear of judgment, because only mutual limits are visible. It's a safe space to explore your relationship.",

    // FAQ
    "faq.title": "Frequently asked questions",
    "faq.subtitle": "Everything you want to know about Nos limites.",
    "faq.q1": "What is Nos limites?",
    "faq.a1":
      "Nos limites is a web app that allows two people to mutually define the boundaries of their relationship. Each person independently checks the behaviors they accept, and only limits checked by both are revealed.",
    "faq.q2": "Can the other person see what I checked?",
    "faq.a2":
      "No, never. Your individual choices remain strictly confidential. Only limits that BOTH of you checked are revealed. If you check something but not the other person, they won't know.",
    "faq.q3": "How does the matching system work?",
    "faq.a3":
      'It works like a "match": each person checks their limits on their side. The app then compares both lists and only reveals items in common. This system protects your vulnerability.',
    "faq.q4": "Is my data safe?",
    "faq.a4":
      "Yes. Your limit data is encrypted. The app is GDPR compliant: you can export or delete all your data at any time. We never sell your data.",
    "faq.q5": "How do I delete my account?",
    "faq.a5":
      'Go to your profile settings and click "Delete my account." All your personal data, relationships, and limits will be permanently erased.',
    "faq.q6": "Is the app free?",
    "faq.a6":
      "Yes, Nos limites is completely free. No hidden fees, no subscription.",
    "faq.q7": "Can I use it without installing?",
    "faq.a7":
      "Yes! Nos limites works directly in your browser. You can also install it as a native app from your browser for quicker access.",
    "faq.q8": "What is the link between Nos limites and consent?",
    "faq.a8":
      "Nos limites is a mutual consent tool. It allows two people to express their boundaries confidentially and only reveal what is accepted by both. It's a modern and caring way to practice informed consent in any relationship.",
    "faq.q9": "Does Nos limites replace a conversation about consent?",
    "faq.a9":
      "No, it's a complement. Nos limites opens dialogue by identifying common boundaries, but communication remains essential. The app is a starting point for deeper, more honest conversations about your limits and those of the other person.",

    // CTA Banner
    "cta.title": "Ready to explore your boundaries?",
    "cta.subtitle":
      "Join Nos limites for free and start discovering the common limits of your relationships.",
    "cta.button": "Get started now",

    // Privacy page
    "privacy.title": "Privacy Policy",
    "privacy.intro":
      "Protecting your personal data is a priority for Nos limites. This policy explains what data we collect, how we use it, and what your rights are.",
    "privacy.collected.title": "Data collected",
    "privacy.collected.text":
      "We only collect data necessary for the service: email address (for authentication), nickname and profile photo (optional), limit data (encrypted), and technical connection data.",
    "privacy.usage.title": "Data usage",
    "privacy.usage.text":
      "Your data is used exclusively to provide the Nos limites service. We never sell or share your personal data with third parties for commercial purposes.",
    "privacy.security.title": "Security",
    "privacy.security.text":
      "Limit data is encrypted at rest. Communications are protected by HTTPS. Access to data is strictly limited.",
    "privacy.rights.title": "Your rights (GDPR)",
    "privacy.rights.text":
      "You have the right to access, rectify, export, and delete your data. You can exercise these rights directly from the app or by contacting us.",
    "privacy.cookies.title": "Cookies",
    "privacy.cookies.text":
      "We only use technical cookies necessary for the application (session, authentication). No tracking or advertising cookies are used.",
    "privacy.retention.title": "Data retention",
    "privacy.retention.text":
      "Your data is kept as long as your account is active. If your account is deleted, all personal data is permanently erased.",

    // Legal page
    "legal.title": "Legal Notice",
    "legal.editor.title": "Publisher",
    "legal.editor.text":
      "Nos limites is a personal project. For any questions, contact us through the app.",
    "legal.hosting.title": "Hosting",
    "legal.hosting.text":
      "The application is hosted by Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, United States.",
    "legal.ip.title": "Intellectual property",
    "legal.ip.text":
      "All content on this site (text, graphics, logo, icons) is protected by copyright. Any reproduction without authorization is prohibited.",

    // Terms page
    "terms.title": "Terms of Use",
    "terms.service.title": "Service description",
    "terms.service.text":
      "Nos limites is a web application allowing two people to mutually define their relationship boundaries through a confidential matching system.",
    "terms.obligations.title": "User obligations",
    "terms.obligations.text":
      "By using the service, you agree to: provide a valid email address, not use the service for malicious purposes, respect other users, and not attempt to access other users' data.",
    "terms.acceptable.title": "Acceptable use",
    "terms.acceptable.text":
      "The service is intended for personal and well-intentioned use. Any abusive use, harassment, or attempts to bypass security are prohibited and may result in account suspension.",
    "terms.liability.title": "Liability",
    "terms.liability.text":
      'The service is provided "as is." We strive to ensure its availability but do not guarantee uninterrupted operation. We are not responsible for indirect damages related to the use of the service.',
    "terms.termination.title": "Termination",
    "terms.termination.text":
      "You can delete your account at any time. We reserve the right to suspend an account in case of violation of these terms.",
  },
} as const;

export type UIKey = keyof (typeof ui)["fr"];
