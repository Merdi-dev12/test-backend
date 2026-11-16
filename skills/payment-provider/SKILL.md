---
name: payment-provider
description: Évaluer ou intégrer un agrégateur de paiement en sandbox dans ce backend, après vérification de son API marchande et de ses garanties.
---

# Fournisseur de paiement

1. Lire la documentation actuelle du fournisseur et distinguer une source officielle d'un SDK communautaire. Ne pas inventer un endpoint, un statut, une signature ou une garantie d'idempotence.
2. Avant de choisir le fournisseur, confirmer : collecte marchande en RDC, CDF, sandbox accessible, authentification, initiation, suivi de statut, vérification des notifications et clé d'idempotence ou procédure de recherche après timeout. Noter les inconnues et interrompre l'intégration si une garantie critique manque.
3. Définir un petit contrat de passerelle au niveau du module paiements. Garder le SDK ou le client HTTP dans un adaptateur ; le service métier ne connaît que les résultats normalisés `pending`, `succeeded` ou `failed`.
4. Garder les clés dans l'environnement et isoler les tests sandbox des tests déterministes. Ne jamais utiliser une clé live pour ce projet.
5. Vérifier le montant CDF, la référence et la commande avant de finaliser. Tester doublons, notification tardive, timeout et réponse contradictoire avec un faux adaptateur, puis confirmer le parcours réel en sandbox.
