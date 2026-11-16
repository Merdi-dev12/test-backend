---
name: backend-delivery
description: Préparer une évolution backend vérifiable et un commit ciblé dans le projet Ziko sans mélanger plusieurs étapes.
---

# Livraison d'une étape

1. Relire l'étape convenue avec l'utilisateur, `git status` et le comportement existant. Identifier les fichiers déjà modifiés avant de travailler.
2. Garder une étape cohérente : code, migration éventuelle, Swagger, tests et README correspondant au même comportement.
3. Exécuter typecheck, build et tests pertinents. Pour une modification SQL ou Docker, vérifier sur un vrai service si disponible ; préciser ce qui n'a pas été exécuté.
4. Contrôler `git diff --check` et la liste exacte des fichiers modifiés. Fournir des commandes `git add` ciblées et un message de commit explicite. Ne pas inclure `.env`, `node_modules` ni `dist`.
5. Ne pas pousser ou publier sans instruction de l'utilisateur. Présenter le résultat et la prochaine étape convenue.
