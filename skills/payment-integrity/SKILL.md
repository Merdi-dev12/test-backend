---
name: payment-integrity
description: Concevoir, modifier ou vérifier le paiement des commandes et son idempotence dans PostgreSQL pour ce dépôt.
---

# Intégrité des paiements

1. Lire migrations et flux existant. Distinguer répétition d'une référence, nouvelle référence pour une commande payée et référence déjà utilisée ailleurs.
2. Séparer tentative, initiation externe et confirmation. Ne garder aucune transaction SQL ouverte pendant l'appel réseau. Pour la finalisation, utiliser une transaction PostgreSQL et un seul client ; verrouiller la commande.
3. Décrémenter le stock conditionnellement ; annuler la transaction si le stock manque. Conserver les contraintes `UNIQUE` en base.
4. Avant toute transition vers `PAID`, vérifier la provenance de la confirmation et recouper référence, commande, montant, devise et statut final. En cas de timeout fournisseur, conserver l'état incertain et réconcilier ; ne jamais relancer aveuglément un débit.
5. Tester en intégration paiement normal, répétition, appels simultanés, conflit de référence, confirmation répétée et timeout. Vérifier l'état final des trois tables.
6. Documenter précisément les réponses HTTP et garder le flux explicable en entretien.
