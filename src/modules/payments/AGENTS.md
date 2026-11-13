# Module payments

- Le même paiement répété ne doit jamais redébiter ou diminuer le stock une seconde fois.
- Une commande ne peut avoir qu'un paiement ; une référence ne peut payer qu'une commande.
- Effectuer les lectures, vérifications et écritures critiques dans la même transaction et avec le même client PostgreSQL.
- Verrouiller la commande. Utiliser une décrémentation conditionnelle du stock et gérer les conflits d'unicité.
- Tester les répétitions et les appels concurrents en intégration avec une vraie base PostgreSQL.
