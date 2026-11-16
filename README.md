# Ziko Boutique — API du test technique

Backend d'une petite boutique de Kinshasa en TypeScript, Express et PostgreSQL. Le serveur, le schéma SQL, Swagger et les routes produits sont disponibles. Les commandes, le paiement et la petite page web demandés dans le sujet seront développés ensuite.

## État actuel

| Élément | État |
| --- | --- |
| `GET /health` | Disponible ; vérifie PostgreSQL |
| Swagger UI `/api-docs` | Disponible ; documente actuellement `/health` |
| Schéma PostgreSQL et migrations SQL | Disponible |
| Création et liste des produits | Disponible : `POST /api/products`, `GET /api/products` |
| Création et consultation des commandes | À développer |
| Paiement et prévention du double paiement | À développer |
| Petite page web | À développer |

## Prérequis

- Git
- Node.js 22 ou plus et npm, pour l'exécution locale
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

3. Toujours dans le terminal, appliquer les migrations puis démarrer l'API :

   ```bash
   npm run db:migrate
   npm run dev
   ```

4. Ouvrir `http://localhost:3000/health` pour vérifier le serveur, puis `http://localhost:3000/api-docs` pour Swagger. Le port se règle avec `PORT` dans `.env`. Dans pgAdmin, rafraîchir la base `ziko` pour voir les tables après la migration.

`npm run dev` utilise `tsx watch` : il redémarre automatiquement le serveur quand un fichier TypeScript change. Nodemon n'est donc pas requis. `npm start` exécute la version compilée sans rechargement.

Pour exécuter la version compilée :

```bash
npm run build
npm start
```

## Lancer avec Docker

Depuis la racine du projet, créer `.env` avec `cp .env.example .env` (ou `Copy-Item .env.example .env` sous PowerShell), puis choisir un `DB_PASSWORD` local. Lancer ensuite :

```bash
docker compose up --build
```

Compose crée le rôle et la base indiqués dans `.env` lors du **premier** démarrage de son volume PostgreSQL, applique les migrations, puis lance l'API. Aucune commande SQL manuelle n'est nécessaire pour cette option. Consulter `/health` et `/api-docs` sur le port `3000` de la machine. Pour arrêter :

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
| `npm test` | Lancer tous les tests |
| `npm run test:unit` | Lancer les tests unitaires |
| `npm run test:integration` | Lancer les tests d'intégration |

## API produits

Créer un produit avec `POST /api/products` et un corps JSON comme `{"name":"Savon","priceCdf":5000,"stock":10}`. Ce sont les trois attributs demandés par le sujet : nom, prix entier en francs congolais et stock disponible. L'API ajoute `id` et `createdAt` à la réponse. Le nom ne peut pas être vide ; le prix et le stock sont des entiers non négatifs. Une entrée invalide renvoie `400` avec le code `INVALID_PRODUCT`.

`GET /api/products?page=1&limit=20` renvoie `{ "items": [...], "page": 1, "limit": 20, "total": 0, "totalPages": 0 }` pour un catalogue vide. La page commence à 1 ; `limit` vaut 20 par défaut et ne peut pas dépasser 100. L'ordre est `createdAt` décroissant, puis `id` décroissant pour départager les produits créés au même instant. Une pagination invalide renvoie `400` avec le code `INVALID_PAGINATION`. Les exemples interactifs sont dans Swagger.

## Architecture et choix techniques

Le serveur est un **monolithe modulaire** : une application Express et une base PostgreSQL, avec un dossier par domaine (`products`, `orders`, `payments`). Ce découpage garde les règles proches de leur domaine sans ajouter la complexité de plusieurs services. Le parcours prévu d'une requête est `route → validation → controller → service → repository → SQL`.

Le SQL est écrit explicitement avec `pg` et des paramètres. Il rend les transactions et les contraintes visibles pour le point central du sujet : empêcher le double paiement. Une migration crée les tables. Le script de migration enregistre les fichiers déjà appliqués dans `schema_migrations` et les exécute par ordre de nom. Il ne faut pas modifier un fichier déjà appliqué : ajouter une nouvelle migration.

`src/config/env.ts` valide les variables au démarrage ; `src/config/db.config.ts` transforme ces valeurs en configuration PostgreSQL ; `src/database/pool.ts` crée le pool de connexions. Les secrets sont dans `.env` sur le poste, jamais dans les fichiers SQL ni dans Git.

La commande garde le prix unitaire au moment de sa création. Elle démarre en `PENDING`. La création vérifie le stock mais ne le réserve pas, car le sujet demande de le diminuer au paiement. Au paiement, une transaction devra verrouiller la commande, revérifier le stock et appliquer le paiement et la décrémentation une seule fois. Les contraintes uniques sur `payments.order_id` et `payments.payment_reference` serviront de protection en base. Ce flux n'est pas encore implémenté.

Redis n'est pas nécessaire à cette initialisation : PostgreSQL peut assurer l'atomicité et l'idempotence attendues. `seeders/` est réservé aux données facultatives de démonstration ; aucune donnée de base n'est requise pour démarrer.

### Agrégateur de paiement envisagé

**Shwary en sandbox est à l'étude**, à la demande du projet. Un [SDK Node.js publié séparément](https://www.npmjs.com/package/@shwary/node-sdk) décrit des paiements CDF en RDC et un mode sandbox. Cependant, le [site public de Shwary](https://shwary.com/) présente actuellement un service de transferts entre particuliers. L'existence et les garanties d'une API de collecte marchande doivent donc être confirmées dans une documentation fournisseur et avec un compte sandbox avant toute intégration. Le sujet exige d'abord la réception d'une référence de paiement : le parcours API demandé restera démontrable sans compte marchand.

## Arborescence

```text
.
├── AGENTS.md                     Consignes communes pour les assistants IA
├── skills/                       Procédures réutilisables pour le développement
├── src/
│   ├── app.ts                    Montage Express et routes communes
│   ├── server.ts                 Démarrage et arrêt du serveur
│   ├── openapi.ts                Contrat Swagger actuellement disponible
│   ├── config/
│   │   ├── env.ts                Validation des variables d'environnement
│   │   └── db.config.ts          Configuration PostgreSQL
│   ├── database/
│   │   ├── pool.ts               Pool PostgreSQL
│   │   ├── migrations/           Évolutions SQL du schéma
│   │   └── seeders/              Données de démonstration facultatives
│   └── modules/
│       ├── products/             Produit et stock
│       ├── orders/               Création et consultation des commandes
│       └── payments/             Paiement et idempotence
├── scripts/                      Commandes de migration et de seed
├── tests/
│   ├── unit/                     Règles métier isolées
│   └── integration/              HTTP, PostgreSQL et concurrence
├── Dockerfile
├── compose.yaml
└── .env.example
```

Dans chaque module, `index.ts` expose sa route, `*.controller.ts` gère HTTP, `*.service.ts` les règles métier, `*.repository.ts` le SQL et `*.schema.ts` les validations. Ces fichiers sont des points de départ à ce stade.

## Tests prévus

Les tests unitaires vérifient la validation et le calcul des pages. Un test HTTP vérifie les paramètres et la réponse sans base de données. Les futurs tests d'intégration couvriront aussi le stock insuffisant, le paiement répété, les références en conflit et deux appels simultanés.

Pour exécuter les tests produit sur une vraie base sous PowerShell :

```powershell
Copy-Item .env.example .env
# Ouvrir .env et remplacer DB_PASSWORD par le mot de passe de la base.
docker compose up --build -d
$env:RUN_DB_TESTS='true'
npm test
```

Si PostgreSQL est lancé localement sans Docker, appliquer d'abord `npm run db:migrate`, puis lancer les deux dernières commandes. Sans `RUN_DB_TESTS=true`, les tests nécessitant PostgreSQL sont ignorés. Sans `.env` ou variables `DB_*`, leur exécution échoue volontairement avec une explication.

## Avec plus de temps

Après les fonctionnalités obligatoires et leurs tests, les améliorations utiles seraient une page web TypeScript pour le parcours complet, une collection Postman, une journalisation structurée et une automatisation CI. Le sujet demande aussi une vidéo de 2 à 3 minutes montrant le paiement répété ; elle sera préparée lorsque ce parcours fonctionnera.

## Consignes de développement

Lire [AGENTS.md](AGENTS.md) avant de modifier le projet. Les guides ciblés se trouvent dans `skills/`. Chaque module possède aussi son propre `AGENTS.md`.
