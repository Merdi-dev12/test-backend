---
name: payment-integrity
description: Concevoir, modifier ou vérifier le paiement des commandes et son idempotence dans PostgreSQL pour ce dépôt.
---

# Intégrité des paiements

1. Lire migrations et flux existant. Distinguer répétition d'une référence, nouvelle référence pour une commande payée et référence déjà utilisée ailleurs.
2. Utiliser une transaction PostgreSQL et un seul client pour toutes les opérations critiques. Verrouiller la commande.
3. Décrémenter le stock conditionnellement ; annuler la transaction si le stock manque. Conserver les contraintes `UNIQUE` en base.
4. Tester en intégration paiement normal, répétition, appels simultanés et conflit de référence. Vérifier l'état final des trois tables.
5. Documenter précisément les réponses HTTP et garder le flux explicable en entretien.
