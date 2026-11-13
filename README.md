# Ziko Boutique — API du test technique

Backend d'une petite boutique de Kinshasa. Le projet utilisera TypeScript, Express et PostgreSQL pour gérer les produits, les commandes et leur paiement. Cette version est **l'initialisation du projet** : serveur, connexion à la base, schéma SQL, Swagger et structure modulaire. Les routes métier et la petite page web demandées dans le sujet seront développées ensuite.

## État actuel

| Élément | État |
| --- | --- |
| `GET /health` | Disponible ; vérifie PostgreSQL |
| Swagger UI `/api-docs` | Disponible ; documente actuellement `/health` |
| Schéma PostgreSQL et migrations SQL | Disponible |
| Création et liste des produits | À développer |
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

1. Créer une base PostgreSQL et un utilisateur autorisé à créer des tables. Par exemple, dans `psql` avec un compte administrateur :

   ```sql
   CREATE USER ziko WITH PASSWORD 'ziko';
   CREATE DATABASE ziko OWNER ziko;
   ```

2. Installer les dépendances et créer la configuration :

   ```bash
   npm ci
   cp .env.example .env
   ```

   Sous PowerShell, remplacer `cp` par `Copy-Item .env.example .env` si nécessaire. Adapter `DATABASE_URL` dans `.env` au serveur PostgreSQL local. Le mot de passe de l'exemple est uniquement destiné au développement local.

3. Appliquer les migrations puis démarrer l'API :

   ```bash
   npm run db:migrate
   npm run dev
   ```

4. Ouvrir `http://localhost:3000/health` pour vérifier le serveur, puis `http://localhost:3000/api-docs` pour Swagger. Le port se règle avec `PORT` dans `.env`.

Pour exécuter la version compilée :

```bash
npm run build
npm start
```

## Lancer avec Docker

Depuis la racine du projet :

```bash
docker compose up --build
```

Compose démarre PostgreSQL, applique les migrations, puis lance l'API. Consulter `/health` et `/api-docs` sur le port `3000` de la machine. Pour arrêter :

```bash
docker compose down
```

Les données PostgreSQL sont conservées dans un volume. `docker compose down -v` supprime ce volume et donc les données locales. En cas de conflit de port, définir `PORT` ou `DB_PORT` dans un fichier `.env` à la racine avant de lancer Compose. `PORT` change le port HTTP exposé ; `DB_PORT` change le port PostgreSQL exposé.

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

## Architecture et choix techniques

Le serveur est un **monolithe modulaire** : une application Express et une base PostgreSQL, avec un dossier par domaine (`products`, `orders`, `payments`). Ce découpage garde les règles proches de leur domaine sans ajouter la complexité de plusieurs services. Le parcours prévu d'une requête est `route → validation → controller → service → repository → SQL`.

Le SQL est écrit explicitement avec `pg` et des paramètres. Il rend les transactions et les contraintes visibles pour le point central du sujet : empêcher le double paiement. Une migration crée les tables. Le script de migration enregistre les fichiers déjà appliqués dans `schema_migrations` et les exécute par ordre de nom. Il ne faut pas modifier un fichier déjà appliqué : ajouter une nouvelle migration.

La commande garde le prix unitaire au moment de sa création. Elle démarre en `PENDING`. La création vérifie le stock mais ne le réserve pas, car le sujet demande de le diminuer au paiement. Au paiement, une transaction devra verrouiller la commande, revérifier le stock et appliquer le paiement et la décrémentation une seule fois. Les contraintes uniques sur `payments.order_id` et `payments.payment_reference` serviront de protection en base. Ce flux n'est pas encore implémenté.

Redis n'est pas nécessaire à cette initialisation : PostgreSQL peut assurer l'atomicité et l'idempotence attendues. `seeders/` est réservé aux données facultatives de démonstration ; aucune donnée de base n'est requise pour démarrer.

## Arborescence

```text
.
├── AGENTS.md                     Consignes communes pour les assistants IA
├── skills/                       Procédures réutilisables pour le développement
├── src/
│   ├── app.ts                    Montage Express et routes communes
│   ├── server.ts                 Démarrage et arrêt du serveur
│   ├── openapi.ts                Contrat Swagger actuellement disponible
│   ├── config/env.ts             Validation des variables d'environnement
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

Les tests unitaires couvriront les validations et règles indépendantes de PostgreSQL. Les tests d'intégration utiliseront une vraie base pour vérifier les routes, les erreurs, le stock insuffisant, le paiement répété, les références en conflit et deux appels simultanés. Les dossiers sont créés ; aucun test métier n'est encore présent.

## Avec plus de temps

Après les fonctionnalités obligatoires et leurs tests, les améliorations utiles seraient une page web TypeScript pour le parcours complet, une collection Postman, une journalisation structurée et une automatisation CI. Le sujet demande aussi une vidéo de 2 à 3 minutes montrant le paiement répété ; elle sera préparée lorsque ce parcours fonctionnera.

## Consignes de développement

Lire [AGENTS.md](AGENTS.md) avant de modifier le projet. Les guides ciblés se trouvent dans `skills/`. Chaque module possède aussi son propre `AGENTS.md`.
