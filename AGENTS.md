# Instructions du dépôt

## Source de vérité

- Lire le README et le code avant toute modification. Ne jamais déduire qu'une route, une table ou un service existe sans le vérifier.
- Le sujet impose TypeScript, PostgreSQL et une protection contre le double paiement. Les décisions techniques détaillées sont dans le README et les migrations.
- Si une information manque, chercher dans le dépôt. Énoncer une hypothèse explicitement avant d'en faire une décision métier.

## Architecture

- Monolithe modulaire Express. Chaque module possède ses routes, controllers, services, repositories et schémas.
- `controller` : transport HTTP uniquement ; `service` : règles métier et transactions ; `repository` : SQL paramétré ; `schema` : validation ; `index` : API publique du module.
- Ne pas importer les fichiers internes d'un autre module. Passer par son `index.ts` ou une dépendance injectée.
- Placer la configuration partagée dans `src/config`, l'accès commun à PostgreSQL dans `src/database`, et les utilitaires réellement partagés dans `src/shared` si nécessaire.
- Un fichier doit conserver une seule responsabilité claire. Éviter les abstractions qui n'ont qu'un seul usage.
- Appliquer SOLID avec mesure : responsabilité unique par fichier et composant ; étendre par composition quand une vraie variation existe ; respecter les contrats des implémentations ; garder les interfaces petites et utiles ; faire dépendre le métier d'un contrat seulement lorsqu'une dépendance externe doit être remplacée ou simulée.
- Préférer des noms explicites, des fonctions courtes et un flux lisible à une hiérarchie de classes ou à un framework interne. Toute abstraction doit répondre à un besoin observable.

## Données et sécurité

- SQL explicite via `pg` ; aucun ORM. Utiliser des paramètres pour toute donnée issue d'une requête.
- Toute évolution du schéma passe par une nouvelle migration SQL, jamais par la modification d'une migration déjà appliquée.
- `seeders` sert uniquement aux données de démonstration ou de développement. Ne pas y placer de données requises au fonctionnement de l'API.
- Ne jamais supposer que la vérification du stock à la commande garantit le stock au paiement.
- Pour payer, utiliser une transaction PostgreSQL, verrouiller la commande, vérifier la référence, décrémenter le stock une seule fois et respecter les contraintes uniques.
- Un appel fournisseur externe ne doit pas être lancé dans une transaction SQL ouverte. Enregistrer d'abord une tentative unique, appeler le fournisseur avec une clé stable si son API le permet, puis finaliser en transaction après confirmation vérifiée.
- Ne jamais marquer une commande `PAID` sur la seule foi d'une réponse d'initiation ou d'un webhook non authentifié. Vérifier identité, montant, devise et état final de la transaction externe.
- Ne jamais appeler un opérateur de paiement réel sans exigence explicite du sujet.

## Configuration et qualité

- Aucune URL, adresse de service, identifiant ou secret en dur dans le code applicatif. Utiliser les variables d'environnement. Les valeurs locales d'exemple appartiennent à `.env.example` et `compose.yaml`.
- La configuration PostgreSQL est centralisée dans `src/config/db.config.ts`. Les identifiants réels restent dans `.env`, jamais dans Git ni dans les migrations.
- TypeScript strict ; valider les entrées aux frontières HTTP et les variables d'environnement au démarrage.
- Mettre à jour Swagger, README et tests lorsque le comportement public change. Ne documenter comme disponible qu'une route réellement implémentée.
- Garder `tests/unit` pour les règles sans base et `tests/integration` pour l'API, SQL et les transactions.
- Avant de terminer : lancer au minimum `npm run typecheck`, `npm run build` et les tests pertinents ; signaler les contrôles non exécutés.
- Aucun fichier `AGENTS.md` ne doit dépasser 300 lignes.

## Skills du dépôt

- Pour ajouter un cas d'usage backend : `skills/backend-module/SKILL.md`.
- Pour modifier le flux de paiement ou les contraintes associées : `skills/payment-integrity/SKILL.md`.
- Pour étudier ou intégrer un fournisseur sandbox : `skills/payment-provider/SKILL.md`.
- Pour préparer un commit et contrôler la livraison : `skills/backend-delivery/SKILL.md`.
