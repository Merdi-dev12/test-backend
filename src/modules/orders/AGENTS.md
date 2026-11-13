# Module orders

- Une commande contient exactement un produit et une quantité positive.
- Capturer le prix unitaire au moment de la création ; le statut initial est `PENDING`.
- Vérifier le stock à la création, puis le revérifier au paiement. La création ne réserve pas le stock.
- Séparer HTTP, validation, métier et SQL selon le `AGENTS.md` racine.
