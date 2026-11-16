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

Dans un terminal, exécuter :

```bash
git clone https://github.com/Merdi-dev12/test-backend.git
cd test-backend
```

Le dépôt public contient le backend. La page Angular demandée par le sujet sera livrée séparément.

Pour le parcours le plus simple, suis **Lancer avec Docker**. Dans ce mode, pgAdmin se connecte avec `DB_USER` et `DB_PASSWORD` de `.env` : le mot de passe du compte administrateur `postgres` n'est pas nécessaire. Le mode **sans Docker** est expliqué ensuite pour une installation PostgreSQL Windows distincte.

## Lancer avec Docker

Suivre ces étapes **dans cet ordre**. Garder Docker démarré pendant l'utilisation de pgAdmin.

1. Démarrer **Docker Desktop**. Dans PowerShell, se placer à la racine du projet. Si `.env` n'existe pas encore, le créer avec `if (-not (Test-Path .env)) { Copy-Item .env.example .env }`. Sous Bash : `test -f .env || cp .env.example .env`.
2. Ouvrir `.env`. Pour une première installation, choisir un `DB_PASSWORD` privé et un `ADMIN_API_KEY` d'au moins 16 caractères. Si la base Docker a déjà servi, **ne pas changer** `DB_USER`, `DB_PASSWORD` ni `DB_NAME` : le volume garde les identifiants du premier démarrage. Les variables pawaPay sont facultatives pour vérifier le lancement.
3. Dans le même terminal, lancer :

   ```powershell
   docker compose up --build -d
   docker compose ps
   ```

   Attendre que la ligne **db** indique `Up ... (healthy)` et montre le port publié, normalement `5432->5432`. Les lignes **api** et **worker** doivent aussi indiquer `Up`. Si **db** est absent ou arrêté, pgAdmin ne pourra pas se connecter.
4. Vérifier l'API dans PowerShell avec `Invoke-RestMethod http://localhost:3000/health` : la réponse attendue est `status : ok`. Si `PORT` diffère de `3000` dans `.env`, utiliser sa valeur. Ouvrir `http://localhost:3000/api-docs` pour Swagger.
5. **Sans arrêter Docker**, ouvrir pgAdmin et créer la connexion ci-dessous. Compose a déjà créé l'utilisateur et la base : ne pas lancer `CREATE USER` ou `CREATE DATABASE`.

   Dans pgAdmin, faire un clic droit sur **Servers → Register → Server...**. Dans **General → Name**, écrire `Ziko Docker`. Dans l'onglet **Connection**, renseigner :

   | Champ pgAdmin | Valeur à saisir |
   | --- | --- |
   | **Host name/address** | `127.0.0.1` : ton PC, où Docker publie le port |
   | **Port** | La valeur de `DB_PORT` dans `.env`, `5432` par défaut |
   | **Maintenance database** | La valeur de `DB_NAME` dans `.env`, `ziko` par défaut |
   | **Username** | La valeur de `DB_USER` dans `.env`, `ziko` par défaut |
   | **Password** | La valeur réelle de `DB_PASSWORD` dans `.env` |

   Cliquer sur **Save**, puis déplier **Servers → Ziko Docker → Databases → ziko → Schemas → public → Tables**. Les tables `products`, `orders`, `payments` et `payment_attempts` doivent être visibles.

Si pgAdmin affiche **connection timeout expired**, revenir à l'étape 3 : vérifier que Docker Desktop est démarré, que **db** est `Up (healthy)` et que le port indiqué dans pgAdmin est celui publié par `docker compose ps`. Un timeout signifie que pgAdmin n'atteint pas le serveur ; il ne signale pas un mauvais mot de passe. Si l'erreur indique au contraire **password authentication failed**, vérifier `DB_USER` et `DB_PASSWORD`, ainsi que l'ancien mot de passe conservé par un éventuel volume Docker.

**Une fois les essais terminés**, arrêter les conteneurs avec `docker compose down`. Les données restent dans le volume PostgreSQL. Ne pas utiliser `docker compose down -v` sauf si tu veux supprimer ces données. En cas de conflit de port, `PORT` règle le port HTTP publié et `DB_PORT` le port PostgreSQL publié sur le PC.

### Tester Node.js local avec PostgreSQL dans Docker

Si PostgreSQL n'est pas installé sur Windows, on peut quand même vérifier le lancement **du serveur Node.js hors Docker** avec la base Docker. Ce test est hybride : il ne prouve pas qu'un PostgreSQL Windows est installé. Après `docker compose up --build -d`, garder `DB_HOST=localhost` et `DB_PORT` égal au port PostgreSQL exposé par Compose dans `.env`. L'API Docker utilise déjà le port HTTP `3000` : dans un nouveau terminal PowerShell, lancer `npm ci` si nécessaire, puis :

```powershell
$env:PORT='3001'
npm run db:migrate
npm run dev
```

Dans un autre terminal, `Invoke-RestMethod http://localhost:3001/health` doit répondre `status : ok`. Arrêter ensuite `npm run dev` avec **Ctrl+C** ; `$env:PORT` ne modifie que ce terminal. Pour un lancement entièrement sans Docker, suivre plutôt la section **Lancer sans Docker avec PostgreSQL Windows**.

## Lancer sans Docker avec PostgreSQL Windows

Ce mode utilise une installation PostgreSQL Windows distincte de la base Docker. Si Docker occupe déjà le port `5432`, l'arrêter avec `docker compose down` avant de démarrer PostgreSQL Windows sur ce même port. Si l'utilisateur `ziko` et la base `ziko` y existent déjà avec les identifiants de `.env`, tu peux les renseigner directement dans pgAdmin comme à l'étape 6 : le compte `postgres` n'est pas nécessaire. Sinon, le compte administrateur `postgres` sert à les créer. Si tu as oublié son mot de passe, lis **Mot de passe `postgres` oublié** ci-dessous avant l'étape 3.

1. **Nouvelle installation Windows uniquement.** Télécharger l'installateur depuis la [page officielle PostgreSQL pour Windows](https://www.postgresql.org/download/windows/). Il contient PostgreSQL et pgAdmin 4. Pendant l'installation, conserver les composants **PostgreSQL Server**, **pgAdmin 4** et **Command Line Tools**. À l'écran **Password**, choisir et noter un nouveau mot de passe pour l'utilisateur administrateur de la base, nommé `postgres`. À l'écran **Port**, garder `5432` s'il est disponible ; sinon noter le port choisi. Terminer l'installation ; **Stack Builder** est facultatif pour ce projet. Ne pas réinstaller par-dessus une installation existante pour résoudre un mot de passe oublié.

2. Ouvrir **pgAdmin 4**. S'il affiche **Set Master Password**, choisir un mot de passe pour ouvrir pgAdmin et le noter. Ce mot de passe sert à pgAdmin. Le champ **Connection → Password** de l'étape suivante demande celui de l'utilisateur PostgreSQL `postgres`, défini à l'écran **Password** de l'installateur.

3. Dans la colonne **Browser** à gauche, faire un clic droit sur **Servers → Register → Server...**. Une fenêtre avec les onglets **General** et **Connection** s'ouvre. Renseigner :

   | Onglet | Champ | Valeur pour PostgreSQL installé sur ce PC |
   | --- | --- | --- |
   | **General** | **Name** | `PostgreSQL local` (nom libre dans pgAdmin) |
   | **Connection** | **Host name/address** | `localhost` |
   | **Connection** | **Port** | `5432`, sauf si PostgreSQL a été installé sur un autre port |
   | **Connection** | **Maintenance database** | `postgres` |
   | **Connection** | **Username** | `postgres` |
   | **Connection** | **Password** | Le mot de passe défini pour `postgres` à l'écran **Password** de l'installateur ; si l'installation existait déjà, utiliser son mot de passe actuel ou suivre la récupération ci-dessous |

   Cliquer sur **Save**. La connexion doit apparaître sous **Servers** avec une flèche permettant de la déplier. Si pgAdmin redemande un mot de passe, saisir celui du compte `postgres`. En cas d'erreur, vérifier que PostgreSQL est démarré et que le port correspond à celui choisi à l'installation.

4. Cliquer successivement sur **Servers → PostgreSQL local** (ou le nom déjà présent) **→ Databases → postgres**. Une fois `postgres` sélectionnée, cliquer sur **Tools → Query Tool** dans le menu supérieur. Dans l'éditeur SQL, exécuter les commandes suivantes **une à la fois** avec le bouton ▶ (**Execute script**). Remplacer `mot-de-passe-local` par un mot de passe choisi pour `ziko` ; si `.env` contient déjà un `DB_PASSWORD` utilisé avec Docker, reprendre cette valeur pour garder les mêmes identifiants dans les deux modes :

   ```sql
   CREATE USER ziko WITH PASSWORD 'mot-de-passe-local';
   CREATE DATABASE ziko OWNER ziko;
   ```

   Vérifier l'absence d'erreur après chaque exécution, puis faire un clic droit sur **Databases → Refresh** : `ziko` doit apparaître. Si le rôle ou la base existent déjà, ne pas relancer leur création. Dans `psql`, la même opération se fait après `psql -U postgres -d postgres` ; `CREATE DATABASE` doit s'exécuter hors d'une transaction explicite.

5. Dans PowerShell, à la racine du projet, installer les dépendances et créer la configuration **une seule fois** :

   ```powershell
   npm ci
   if (-not (Test-Path .env)) { Copy-Item .env.example .env }
   ```

   Sous Bash : `npm ci` puis `test -f .env || cp .env.example .env`. Ne pas recopier l'exemple sur un `.env` déjà configuré : cela effacerait les paramètres locaux. Ouvrir `.env` et vérifier ces lignes :

   ```dotenv
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=ziko
   DB_USER=ziko
   DB_PASSWORD=mot-de-passe-local
   ```

   `DB_PASSWORD` doit contenir **exactement** le mot de passe donné à `CREATE USER` à l'étape 4 ; adapter `DB_PORT` si PostgreSQL utilise un autre port. Si Docker possède déjà une base et que tu changes `DB_PASSWORD` dans `.env`, son volume conservera l'ancien mot de passe : réutiliser la même valeur évite ce conflit. `.env` reste sur ton ordinateur et est ignoré par Git.

6. Vérifier maintenant la connexion **avec le compte de l'application** dans pgAdmin. Faire un clic droit sur **Servers → Register → Server...**, puis recopier les valeurs de `.env` dans les champs suivants :

   | Onglet | Champ pgAdmin | Valeur de `.env` |
   | --- | --- | --- |
   | **General** | **Name** | `Ziko local` (nom libre, ce n'est pas une variable) |
   | **Connection** | **Host name/address** | `DB_HOST` : `localhost` |
   | **Connection** | **Port** | `DB_PORT` : `5432` |
   | **Connection** | **Maintenance database** | `DB_NAME` : `ziko` |
   | **Connection** | **Username** | `DB_USER` : `ziko` |
   | **Connection** | **Password** | La valeur réelle de `DB_PASSWORD` |

   Cliquer sur **Save**, puis déplier **Servers → Ziko local → Databases**. La base `ziko` doit apparaître. Le mot de passe du compte `postgres` sert uniquement à la connexion d'administration de l'étape 3 ; `DB_PASSWORD` est celui du compte `ziko` utilisé par l'application.

7. Pour activer pawaPay, ajouter dans `.env` `PAWAPAY_BASE_URL` avec l'URL officielle de la sandbox et `PAWAPAY_API_TOKEN` avec le jeton du tableau de bord sandbox. Sans ces deux valeurs, l'API démarre, mais l'initiation répond `503 PROVIDER_NOT_CONFIGURED`. Définir également `ADMIN_API_KEY` avec une valeur aléatoire d'au moins 16 caractères si l'API est exposée ; elle sera obligatoire avec `NODE_ENV=production`. Le jeton reste dans `.env`, jamais dans Git ni dans le frontend.

8. Toujours dans PowerShell, appliquer les migrations, puis démarrer l'API. Laisser le terminal ouvert :

   ```bash
   npm run db:migrate
   npm run dev
   ```

9. Dans un second terminal, exécuter `Invoke-RestMethod http://localhost:3000/health` : la réponse attendue est `status : ok`. Ouvrir ensuite `http://localhost:3000/api-docs` dans le navigateur pour Swagger. Le port se règle avec `PORT` dans `.env`. Dans pgAdmin, sous **Servers → Ziko local → Databases → ziko → Schemas → public**, faire un clic droit sur **Tables → Refresh** pour voir les tables créées par les migrations. Arrêter l'API avec **Ctrl+C** dans son terminal.

### Mot de passe `postgres` oublié

Si **Servers** contient déjà une connexion administrateur qui s'ouvre sans demander le mot de passe, sélectionner sa base `postgres`, ouvrir **Tools → Query Tool** et exécuter `ALTER ROLE postgres WITH PASSWORD 'nouveau-mot-de-passe';` en choisissant la nouvelle valeur. Utiliser ensuite ce mot de passe à l'étape 3. Si aucune connexion ne fonctionne, réinitialiser le mot de passe de l'installation locale existante sans supprimer ses données :

1. Dans Windows, ouvrir **Services** (`services.msc`), trouver `postgresql-x64-<version>` et vérifier qu'il est démarré. Ouvrir ses **Properties** et repérer dans **Path to executable** le dossier indiqué après `-D` : c'est le dossier des données. S'il n'y a pas de service PostgreSQL, vérifier l'installation plutôt que modifier des fichiers au hasard.
2. Dans ce dossier des données, copier `pg_hba.conf` pour en garder une sauvegarde. Ouvrir l'original avec un éditeur lancé en administrateur et ajouter **temporairement, tout en haut** cette seule ligne, puis enregistrer :

   ```text
   host postgres postgres 127.0.0.1/32 trust
   ```

3. Dans PowerShell, ouvrir `psql.exe` depuis le dossier `bin` de cette installation. Exemple : `& 'C:\Program Files\PostgreSQL\<version>\bin\psql.exe' -h 127.0.0.1 -p 5432 -U postgres -d postgres` ; remplacer `<version>` et le port si nécessaire. À l'invite `postgres=#`, saisir `\password postgres`, entrer deux fois un nouveau mot de passe, puis `\q` pour sortir. Cette commande évite d'écrire le nouveau mot de passe dans l'historique SQL.
4. **Restaurer immédiatement** le fichier `pg_hba.conf` original depuis la sauvegarde : l'accès sans mot de passe doit disparaître. Sur Windows, les nouvelles connexions prennent en compte cette modification. Vérifier ensuite qu'une connexion avec le nouveau mot de passe fonctionne dans pgAdmin. Ne jamais laisser la ligne `trust` en place.

Cette récupération concerne uniquement un PostgreSQL installé sur Windows, pas la base Docker. Elle suit les règles d'authentification et de modification de mot de passe de la [documentation PostgreSQL](https://www.postgresql.org/docs/16/auth-pg-hba-conf.html).

`npm run dev` utilise `tsx watch` : il redémarre automatiquement le serveur quand un fichier TypeScript change. Nodemon n'est donc pas requis. `npm start` exécute la version compilée sans rechargement.

Pour exécuter la version compilée :

```bash
npm run build
npm start
```

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

Le sujet décrit une API recevant un identifiant de paiement simulé. Ici, le backend crée cet identifiant (`depositId`) et le transmet à la sandbox : le client réutilise la même commande lors d'un nouvel appel. Cette variante permet de vérifier le résultat auprès de pawaPay avant de déclarer la commande payée. Une commande déjà `PAID` renvoie `409 ORDER_ALREADY_PAID` sans nouvel appel fournisseur.

`GET /api/orders/:id/payments` consulte pawaPay puis renvoie `orderId`, `depositId` et le dernier `status`. Le champ `alreadyProcessed` appartient uniquement à la réponse d'initiation `POST` ; consulter le statut n'initie aucun second paiement. `ACCEPTED` ne paie pas la commande. Seul un résultat final `COMPLETED` avec le bon `depositId`, le montant CDF et l'opérateur attendus met la commande à `PAID` et consomme le stock réservé, dans une transaction PostgreSQL. `FAILED` libère la réservation et autorise une nouvelle tentative. `UNKNOWN` conserve la réservation : après un timeout, la réconciliation recherche le dépôt et ne relance l'initiation qu'avec le **même** `depositId`. `GET /api/orders/:id` expose l'état de la commande.

`POST /api/webhooks/pawapay/deposits` reçoit les notifications si une URL publique est configurée dans pawaPay. Le corps sert seulement à identifier le dépôt : le backend interroge lui-même pawaPay avant de finaliser. Une notification répétée ne consomme pas deux fois le stock. En local sans URL publique, utiliser le `GET` ci-dessus et le worker (`npm run payments:worker`). Le callback doit être configuré sur une URL HTTPS publique avant de l'activer chez pawaPay.

## Architecture et choix techniques

Le serveur est un **monolithe modulaire** : une application Express et une base PostgreSQL, avec un dossier par domaine (`products`, `orders`, `payments`). Ce découpage garde les règles proches de leur domaine sans ajouter la complexité de plusieurs services. Le parcours prévu d'une requête est `route → validation → controller → service → repository → SQL`.

Le SQL est écrit explicitement avec `pg` et des paramètres. Il rend les transactions et les contraintes visibles pour le point central du sujet : empêcher le double paiement. Les migrations créent les tables initiales puis les tentatives et réservations. Le script de migration enregistre les fichiers déjà appliqués dans `schema_migrations` et les exécute par ordre de nom. Il ne faut pas modifier un fichier déjà appliqué : ajouter une nouvelle migration. Le prix est nommé `priceCdf` et stocké en entier, car l'exercice ne demande qu'une devise ; `price` et `currency` seraient utiles dans un catalogue multidevise.

`src/config/env.ts` valide les variables au démarrage ; `src/config/db.config.ts` transforme ces valeurs en configuration PostgreSQL ; `src/database/pool.ts` crée le pool de connexions. Les secrets sont dans `.env` sur le poste, jamais dans les fichiers SQL ni dans Git.

La commande garde le prix unitaire au moment de sa création et démarre en `PENDING`. L'initiation réserve le stock sans le diminuer. L'appel réseau pawaPay se fait **hors transaction SQL**. La finalisation verrouille la commande, vérifie le résultat externe, consomme la réservation et enregistre le paiement une seule fois. Les contraintes uniques sur `payments` et l'index unique des tentatives actives protègent les cas concurrents. La réservation n'expire pas sur une simple minuterie : il faut d'abord connaître un échec final pour éviter qu'un client soit débité après la libération du stock.

Avec plus de temps, j'ajouterais un suivi des tentatives dont pawaPay ne donne jamais de résultat final : elles gardent le stock réservé, et nécessitent une vérification manuelle ou une alerte avant toute libération sûre.

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

### Responsabilité de chaque fichier d'un module

Les trois modules suivent le même trajet : `index.ts` branche les routes, le controller valide et traduit HTTP, le service décide, puis le repository exécute le SQL. Les imports entre modules passent par leur `index.ts` ou par une dépendance explicite.

| Fichier | Responsabilité |
| --- | --- |
| `src/modules/products/index.ts` | Déclare les routes produits ; protège la création avec `requireAdmin`. |
| `src/modules/products/products.controller.ts` | Lit le corps et la pagination, renvoie les réponses et erreurs HTTP. |
| `src/modules/products/products.schema.ts` | Valide le nom, le prix CDF, le stock et les paramètres de liste. |
| `src/modules/products/products.service.ts` | Crée l'identifiant du produit et compose la réponse paginée. |
| `src/modules/products/products.repository.ts` | Insère et liste les produits avec des requêtes SQL paramétrées. |
| `src/modules/orders/index.ts` | Déclare les routes de création et de lecture des commandes. |
| `src/modules/orders/orders.controller.ts` | Valide les requêtes et associe les erreurs métier aux statuts HTTP. |
| `src/modules/orders/orders.schema.ts` | Valide l'identifiant produit, la quantité et l'identifiant commande. |
| `src/modules/orders/orders.service.ts` | Lance la création ou la lecture et distingue produit absent et stock insuffisant. |
| `src/modules/orders/orders.repository.ts` | Enregistre la commande avec le prix figé et vérifie le stock disponible. |
| `src/modules/payments/index.ts` | Déclare les routes d'initiation, de consultation et de callback. |
| `src/modules/payments/payments.controller.ts` | Valide les entrées, retourne les statuts HTTP et accepte les callbacks. |
| `src/modules/payments/payments.schema.ts` | Valide l'identifiant de commande, l'opérateur, le numéro et le callback. |
| `src/modules/payments/payments.service.ts` | Orchestre tentative, réservation, appel fournisseur, vérification et finalisation idempotente. |
| `src/modules/payments/payments.repository.ts` | Gère les transactions, verrous, tentatives, paiements et mouvements de stock en SQL. |
| `src/modules/payments/payment.gateway.ts` | Définit le petit contrat qui permet de simuler la passerelle dans les tests. |
| `src/modules/payments/pawapay.gateway.ts` | Appelle l'API sandbox pawaPay et transforme ses réponses en états internes. |
| `src/modules/*/AGENTS.md` | Précise les règles propres au domaine pour les assistants IA. |

Hors des modules, `src/app.ts` configure Express, les middlewares et les routes ; `src/server.ts` gère le cycle de vie ; `src/openapi.ts` décrit l'API Swagger. `src/config/` valide et centralise la configuration, `src/database/pool.ts` ouvre les connexions, et `src/shared/admin-access.ts` contrôle la création des produits. `scripts/migrate.ts` applique les migrations, `scripts/seed.ts` est un point d'entrée encore vide pour les données de démonstration et `scripts/reconcile-payments.ts` relance la consultation des tentatives incertaines. `tests/unit/` isole les règles et `tests/integration/` vérifie HTTP, SQL et concurrence.

## Tests

Les tests unitaires vérifient les validations, le calcul des pages et les erreurs métier des commandes. Les tests d'intégration HTTP et PostgreSQL vérifient les produits, commandes, réservations, paiements concurrents, répétitions, échecs et coupures réseau. L'adaptateur pawaPay est remplacé par un faux dans les tests déterministes ; les essais réels se font séparément dans la sandbox.

Pour exécuter tous les tests sur une vraie base sous PowerShell :

```powershell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
# Vérifier DB_PASSWORD et ADMIN_API_KEY dans .env avant de lancer Compose.
docker compose up --build -d
$env:RUN_DB_TESTS='true'
npm test
```

Si PostgreSQL est lancé localement sans Docker, appliquer d'abord `npm run db:migrate`, puis lancer les deux dernières commandes. Sans `RUN_DB_TESTS=true`, les tests nécessitant PostgreSQL sont ignorés. Sans `.env` ou variables `DB_*`, leur exécution échoue volontairement avec une explication.

## Consignes de développement

Lire [AGENTS.md](AGENTS.md) avant de modifier le projet. Les guides ciblés se trouvent dans `skills/`. Chaque module possède aussi son propre `AGENTS.md`.
