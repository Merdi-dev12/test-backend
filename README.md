# Ziko Boutique — API du test technique

Backend d'une petite boutique de Kinshasa en TypeScript, Express et PostgreSQL. Le paiement utilise exclusivement la sandbox pawaPay : aucun opérateur réel n'est débité. Le frontend Angular est un projet séparé.

## État actuel

| Élément | État |
| --- | --- |
| `GET /health` | Disponible ; vérifie PostgreSQL |
| Swagger UI `/api-docs` | Disponible ; documente les routes existantes |
| Schéma PostgreSQL et migrations SQL | Disponible |
| Création et liste des produits | Disponible : `POST /api/products`, `GET /api/products` |
| Création et consultation des commandes | Disponible : `POST /api/orders`, `GET /api/orders/:id` |
| Paiement sandbox et prévention du double paiement | Disponible : initiation, consultation, callback et réconciliation |
| Frontend Angular | Projet séparé, à développer |

## Prérequis

- Git
- Node.js 22.12 ou plus et npm, pour l'exécution locale
- PostgreSQL 16 ou plus, pour l'exécution locale
- Docker et Docker Compose, pour l'exécution conteneurisée

## Cloner le projet

Copier l'adresse du dépôt GitHub public, puis exécuter :

```bash
git clone <adresse-du-depot>
cd test-backend
```

L'adresse réelle du dépôt sera ajoutée une fois le dépôt publié ; aucune adresse distante n'est supposée ici.

## Lancer en local

1. Ouvrir **pgAdmin 4**, se connecter au serveur PostgreSQL local avec le compte administrateur créé à l'installation, sélectionner la base de maintenance `postgres`, puis ouvrir **Tools → Query Tool**. Y exécuter les deux commandes suivantes séparément, en remplaçant le mot de passe par une valeur choisie pour ton poste :

   ```sql
   CREATE USER ziko WITH PASSWORD 'mot-de-passe-local';
   CREATE DATABASE ziko OWNER ziko;
   ```

   Dans `psql`, la même opération se fait après `psql -U postgres -d postgres` (saisir le mot de passe administrateur quand il est demandé). `CREATE DATABASE` doit s'exécuter hors d'une transaction explicite. Si le rôle ou la base existent déjà, réutiliser ceux-ci et passer à l'étape suivante.

2. Dans le terminal, à la racine du projet, installer les dépendances et créer la configuration :

   ```bash
   npm ci
   cp .env.example .env
   ```

   Sous PowerShell, `Copy-Item .env.example .env` fonctionne aussi. Ouvrir `.env`, remplacer `DB_PASSWORD=change-me-local` par le mot de passe choisi à l'étape 1, et vérifier `DB_HOST`, `DB_PORT`, `DB_NAME` et `DB_USER`. L'application lit ce fichier automatiquement ; pgAdmin sert à administrer PostgreSQL, il ne transmet pas ses identifiants à l'application. Le rôle et son mot de passe sont gérés par PostgreSQL ; la copie nécessaire à l'application est dans `.env`, ignoré par Git.

3. Pour activer pawaPay, ajouter dans `.env` `PAWAPAY_BASE_URL` avec l'URL officielle de la sandbox et `PAWAPAY_API_TOKEN` avec le jeton du tableau de bord sandbox. Sans ces deux valeurs, l'API démarre, mais l'initiation répond `503 PROVIDER_NOT_CONFIGURED`. Définir également `ADMIN_API_KEY` avec une valeur aléatoire d'au moins 16 caractères si l'API est exposée ; elle sera obligatoire avec `NODE_ENV=production`. Le jeton reste dans `.env`, jamais dans Git ni dans le frontend.

4. Toujours dans le terminal, appliquer les migrations puis démarrer l'API :

   ```bash
   npm run db:migrate
   npm run dev
   ```

5. Ouvrir `http://localhost:3000/health` pour vérifier le serveur, puis `http://localhost:3000/api-docs` pour Swagger. Le port se règle avec `PORT` dans `.env`. Dans pgAdmin, rafraîchir la base `ziko` pour voir les tables après la migration.

`npm run dev` utilise `tsx watch` : il redémarre automatiquement le serveur quand un fichier TypeScript change. Nodemon n'est donc pas requis. `npm start` exécute la version compilée sans rechargement.

Pour exécuter la version compilée :

```bash
npm run build
npm start
```

## Lancer avec Docker

Depuis la racine du projet, créer `.env` avec `cp .env.example .env` (ou `Copy-Item .env.example .env` sous PowerShell), puis choisir un `DB_PASSWORD` local et un `ADMIN_API_KEY` privé d'au moins 16 caractères. Les variables pawaPay sont optionnelles tant que le paiement n'est pas testé. Lancer ensuite :

```bash
docker compose up --build
```

Compose crée le rôle et la base indiqués dans `.env` lors du **premier** démarrage de son volume PostgreSQL, applique les migrations, puis lance l'API et un worker de réconciliation. Aucune commande SQL manuelle n'est nécessaire pour cette option. Consulter `/health` et `/api-docs` sur le port `3000` de la machine. Pour arrêter :

```bash
docker compose down
```

Les données PostgreSQL sont conservées dans un volume. Changer `DB_USER`, `DB_PASSWORD` ou `DB_NAME` dans `.env` après la création de ce volume ne recrée pas le rôle ni la base : il faut les modifier dans PostgreSQL ou recréer volontairement le volume. `docker compose down -v` supprime ce volume et donc les données locales. En cas de conflit de port, définir `PORT` ou `DB_PORT` dans `.env`. `PORT` change le port HTTP exposé ; `DB_PORT` change le port PostgreSQL exposé sur la machine. Pour voir la base Docker dans pgAdmin, enregistrer un serveur avec l'hôte `localhost`, le port `DB_PORT`, le rôle `DB_USER` et le mot de passe `DB_PASSWORD`.

## Commandes utiles

| Commande | Rôle |
| --- | --- |
| `npm run dev` | Démarrer le serveur avec rechargement |
| `npm run build` | Compiler TypeScript dans `dist/` |
| `npm run typecheck` | Vérifier les types |
| `npm run db:migrate` | Appliquer les nouvelles migrations SQL |
| `npm run db:seed` | Point d'entrée des données de démonstration ; aucun seeder défini actuellement |
| `npm run payments:reconcile` | Rechercher une fois les résultats des paiements en attente |
| `npm run payments:worker` | Réconcilier les paiements en boucle en local |
| `npm test` | Lancer tous les tests |
| `npm run test:unit` | Lancer les tests unitaires |
| `npm run test:integration` | Lancer les tests d'intégration |

## API produits

Créer un produit avec `POST /api/products` et un corps JSON comme `{"name":"Savon","priceCdf":5000,"stock":10}`. Ce sont les trois attributs demandés par le sujet : nom, prix entier en francs congolais et stock physique. L'API ajoute `id` et `createdAt` à la réponse. Le nom ne peut pas être vide ; le prix et le stock sont des entiers non négatifs. Une entrée invalide renvoie `400 INVALID_PRODUCT`. Si `ADMIN_API_KEY` est définie, l'en-tête `x-admin-key` est requis pour cette route ; il est toujours requis en production.

`GET /api/products?page=1&limit=20` renvoie `{ "items": [...], "page": 1, "limit": 20, "total": 0, "totalPages": 0 }` pour un catalogue vide. La page commence à 1 ; `limit` vaut 20 par défaut et ne peut pas dépasser 100. L'ordre est `createdAt` décroissant, puis `id` décroissant pour départager les produits créés au même instant. Une pagination invalide renvoie `400` avec le code `INVALID_PAGINATION`. Les exemples interactifs sont dans Swagger.

## API commandes

Créer une commande avec `POST /api/orders` et `{"productId":"<uuid-du-produit>","quantity":2}`. Le produit doit exister et son stock non réservé doit couvrir la quantité demandée. La quantité doit être un entier de 1 à 1 000 000 ; cette limite garde le total calculé dans la plage sûre des entiers JavaScript. La réponse `201` contient la commande avec `status: "PENDING"`, le prix unitaire copié du produit et `totalCdf`. La création ne réserve ni ne diminue le stock ; la réservation atomique se fait à l'initiation du paiement. `GET /api/orders/:id` renvoie la commande et son statut.

Une entrée invalide renvoie `400 INVALID_ORDER`, un identifiant de commande mal formé `400 INVALID_ORDER_ID`, un produit absent `404 PRODUCT_NOT_FOUND`, une commande absente `404 ORDER_NOT_FOUND` et un stock insuffisant `409 INSUFFICIENT_STOCK`.

## API paiements

`POST /api/orders/:id/payments` reçoit `{"provider":"VODACOM_MPESA_COD","phoneNumber":"243813456789"}`. Le serveur vérifie la commande, réserve le stock et enregistre un `depositId` unique avant d'appeler la sandbox pawaPay. La réponse `202` contient `orderId`, `depositId`, `status` (`PENDING`, `UNKNOWN` ou `FAILED`) et `alreadyProcessed`. Une répétition de la même initiation récupère la tentative existante ; un autre numéro ou opérateur pendant cette tentative renvoie `409 PAYMENT_IN_PROGRESS`. Le client ne fournit ni montant ni référence arbitraire.

`GET /api/orders/:id/payments` consulte pawaPay puis renvoie le dernier état. `ACCEPTED` ne paie pas la commande. Seul un résultat final `COMPLETED` avec le bon `depositId`, le montant CDF et l'opérateur attendus met la commande à `PAID` et consomme le stock réservé, dans une transaction PostgreSQL. `FAILED` libère la réservation et autorise une nouvelle tentative. `UNKNOWN` conserve la réservation : après un timeout, la réconciliation recherche le dépôt et ne relance l'initiation qu'avec le **même** `depositId`. `GET /api/orders/:id` expose l'état de la commande.

`POST /api/webhooks/pawapay/deposits` reçoit les notifications si une URL publique est configurée dans pawaPay. Le corps sert seulement à identifier le dépôt : le backend interroge lui-même pawaPay avant de finaliser. Une notification répétée ne consomme pas deux fois le stock. En local sans URL publique, utiliser le `GET` ci-dessus et le worker (`npm run payments:worker`). Le callback doit être configuré sur une URL HTTPS publique avant de l'activer chez pawaPay.

## Architecture et choix techniques

Le serveur est un **monolithe modulaire** : une application Express et une base PostgreSQL, avec un dossier par domaine (`products`, `orders`, `payments`). Ce découpage garde les règles proches de leur domaine sans ajouter la complexité de plusieurs services. Le parcours prévu d'une requête est `route → validation → controller → service → repository → SQL`.

Le SQL est écrit explicitement avec `pg` et des paramètres. Il rend les transactions et les contraintes visibles pour le point central du sujet : empêcher le double paiement. Les migrations créent les tables initiales puis les tentatives et réservations. Le script de migration enregistre les fichiers déjà appliqués dans `schema_migrations` et les exécute par ordre de nom. Il ne faut pas modifier un fichier déjà appliqué : ajouter une nouvelle migration.

`src/config/env.ts` valide les variables au démarrage ; `src/config/db.config.ts` transforme ces valeurs en configuration PostgreSQL ; `src/database/pool.ts` crée le pool de connexions. Les secrets sont dans `.env` sur le poste, jamais dans les fichiers SQL ni dans Git.

La commande garde le prix unitaire au moment de sa création et démarre en `PENDING`. L'initiation réserve le stock sans le diminuer. L'appel réseau pawaPay se fait **hors transaction SQL**. La finalisation verrouille la commande, vérifie le résultat externe, consomme la réservation et enregistre le paiement une seule fois. Les contraintes uniques sur `payments` et l'index unique des tentatives actives protègent les cas concurrents. La réservation n'expire pas sur une simple minuterie : il faut d'abord connaître un échec final pour éviter qu'un client soit débité après la libération du stock.

Redis n'est pas nécessaire à cette initialisation : PostgreSQL peut assurer l'atomicité et l'idempotence attendues. `seeders/` est réservé aux données facultatives de démonstration ; aucune donnée de base n'est requise pour démarrer.

### Agrégateur de paiement

La [documentation officielle pawaPay](https://docs.pawapay.io/v2/docs/providers) confirme les collectes en CDF via Vodacom M-Pesa, Airtel et Orange en RDC. La sandbox est isolée de la production. L'adaptateur HTTP reste dans le module `payments` ; le service métier dépend d'un contrat de passerelle simulable dans les tests. Le worker interroge les tentatives non résolues toutes les 30 secondes lorsque les identifiants sandbox sont configurés. Aucun jeton live et aucun paiement réel ne sont utilisés.

Les routes publiques sont limitées en fréquence, les entrées sont validées, les en-têtes de sécurité sont ajoutés par Helmet et CORS n'autorise que `CORS_ORIGIN` si elle est définie. La création de produits exige `x-admin-key` lorsque `ADMIN_API_KEY` est configurée et toujours en production. Les commandes restent accessibles par identifiant UUID pour permettre le parcours invité du test ; une authentification des clients et une protection contre l'énumération seraient nécessaires pour une boutique publique.

## Arborescence

```text
.
├── AGENTS.md                     Consignes communes pour les assistants IA
├── skills/                       Procédures réutilisables pour le développement
├── src/
│   ├── app.ts                    Montage Express et routes communes
│   ├── server.ts                 Démarrage et arrêt du serveur
│   ├── openapi.ts                Contrat Swagger des routes disponibles
│   ├── config/
│   │   ├── env.ts                Validation des variables d'environnement
│   │   └── db.config.ts          Configuration PostgreSQL
│   ├── database/
│   │   ├── pool.ts               Pool PostgreSQL
│   │   ├── migrations/           Évolutions SQL du schéma
│   │   └── seeders/              Données de démonstration facultatives
│   ├── shared/                   Contrôle administrateur
│   └── modules/
│       ├── products/             Produit et stock
│       ├── orders/               Création et consultation des commandes
│       └── payments/             Passerelle pawaPay, tentative, réservation et finalisation
├── scripts/                      Migration, seed et réconciliation
├── tests/
│   ├── unit/                     Règles métier isolées
│   └── integration/              HTTP, PostgreSQL et concurrence
├── Dockerfile
├── compose.yaml
└── .env.example
```

Dans chaque module, `index.ts` expose sa route, `*.controller.ts` gère HTTP, `*.service.ts` les règles métier, `*.repository.ts` le SQL et `*.schema.ts` les validations. `payment.gateway.ts` définit le contrat fournisseur et `pawapay.gateway.ts` son adaptateur sandbox.

## Tests

Les tests unitaires vérifient les validations, le calcul des pages et les erreurs métier des commandes. Les tests d'intégration HTTP et PostgreSQL vérifient les produits, commandes, réservations, paiements concurrents, répétitions, échecs et coupures réseau. L'adaptateur pawaPay est remplacé par un faux dans les tests déterministes ; les essais réels se font séparément dans la sandbox.

Pour exécuter tous les tests sur une vraie base sous PowerShell :

```powershell
Copy-Item .env.example .env
# Ouvrir .env et remplacer DB_PASSWORD par le mot de passe de la base.
docker compose up --build -d
$env:RUN_DB_TESTS='true'
npm test
```

Si PostgreSQL est lancé localement sans Docker, appliquer d'abord `npm run db:migrate`, puis lancer les deux dernières commandes. Sans `RUN_DB_TESTS=true`, les tests nécessitant PostgreSQL sont ignorés. Sans `.env` ou variables `DB_*`, leur exécution échoue volontairement avec une explication.

## Avec plus de temps

Après les fonctionnalités obligatoires et leurs tests, les améliorations utiles seraient le frontend Angular séparé, une collection Postman partageable, une journalisation structurée, une authentification des clients, un stockage distribué pour les limites de débit et une automatisation CI. Le sujet demande aussi une vidéo de 2 à 3 minutes montrant le paiement répété ; elle reste à préparer.

## Consignes de développement

Lire [AGENTS.md](AGENTS.md) avant de modifier le projet. Les guides ciblés se trouvent dans `skills/`. Chaque module possède aussi son propre `AGENTS.md`.
