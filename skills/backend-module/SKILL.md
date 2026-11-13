---
name: backend-module
description: Ajouter ou modifier un cas d'usage dans les modules Express TypeScript de ce dépôt, avec SQL, validation, documentation et tests cohérents.
---

# Développement d'un module

1. Lire le README, les `AGENTS.md` applicables et les fichiers présents. Identifier le contrat attendu avant de coder.
2. Définir entrées, réponse et erreurs. Valider aux frontières. Garder les règles dans le service et le SQL paramétré dans le repository.
3. Ajouter une nouvelle migration si le schéma change. Éviter les couches ou dépendances sans besoin concret.
4. Synchroniser Swagger et README avec le comportement livré. Tester les règles isolées dans `tests/unit` et HTTP ou SQL dans `tests/integration`.
5. Lancer typecheck, build et tests concernés ; rapporter les limites observées.
