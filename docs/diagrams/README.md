# Diagrammes UML - LOG430 Magasin

Ce dossier contient tous les diagrammes UML du système de gestion de magasin LOG430, créés avec PlantUML et reflétant l'architecture actuelle du système.

## Diagrammes disponibles

### 1. Diagramme d'architecture système (`architecture-systeme.puml`)

**Description** : Vue d'ensemble de l'architecture microservices avec Kong Gateway, services backend, base de données partagée, Redis, et monitoring.

**Composants principaux** :

- Frontend React avec Vite
- Kong API Gateway
- 3 microservices (Catalog, Transaction, User)
- Base de données PostgreSQL partagée
- Redis pour le cache
- Monitoring avec Prometheus et Grafana
- Tests de charge avec k6

### 2. Diagramme de classes (`diagramme-classe.puml`)

**Description** : Modèle de classes détaillé montrant les entités du domaine, les couches application, infrastructure et frontend.

**Packages principaux** :

- Domain Models (Store, Product, Stock, User, Sale, Refund, etc.)
- Application Layer (Use Cases pour chaque domaine)
- Infrastructure Controllers (REST API endpoints)
- Shared Infrastructure (Cache, HTTP Client, Metrics)
- Frontend Components (React/Context)
- API Services (Frontend vers Backend)

### 3. Diagramme des cas d'utilisation (`diagramme-CU.puml`)

**Description** : Cas d'utilisation pour les acteurs Client et Gestionnaire (Admin).

**Acteurs** :

- **Client** : Consultation produits, gestion panier, achat, historique, remboursements
- **Gestionnaire** : Gestion complète des produits, magasins, inventaire, rapports, dashboard

**Cas d'utilisation système** : Réservation stock, cache, métriques

### 4. Diagramme de déploiement (`diagramme-deploiement.puml`)

**Description** : Architecture de déploiement avec Docker Compose, montrant tous les conteneurs et leurs connexions.

**Conteneurs** :

- Frontend (Nginx + React)
- Kong Gateway
- Services backend (Node.js + Express)
- Base de données PostgreSQL
- Redis Cache
- Monitoring (Prometheus + Grafana)
- Migration de DB

### 5. Modèle du domaine (`MDD.puml`)

**Description** : Modèle conceptuel des entités métier avec leurs relations et contraintes.

**Entités principales** :

- Product, Store, Stock, User, Sale, SaleLine, Refund, RefundLine

**Contraintes importantes** :

- Stock : UNIQUE(storeId, productId)
- User : UNIQUE(name)
- Relations 1:n et n:m entre entités

### 6. Diagramme de séquence - Vente (`RDCU-Vente.puml`)

**Description** : Séquence détaillée du processus de vente avec validation de stock et gestion des transactions.

**Flux principal** :

1. Client ajoute au panier et procède au checkout
2. Frontend → Kong Gateway → Transaction Service
3. Validation du stock via Catalog Service
4. Création de la vente et mise à jour du stock
5. Invalidation du cache et métriques
6. Retour du reçu au client

### 7. Diagramme de séquence - Remboursement (`RDCU-Remboursement.puml`)

**Description** : Séquence du processus de remboursement avec restoration du stock.

**Flux principal** :

1. Client consulte l'historique et demande un remboursement
2. Validation de la vente et éligibilité
3. Création du remboursement
4. Restoration du stock via Catalog Service
5. Mise à jour du statut de vente
6. Invalidation des caches

## Génération des diagrammes

Pour générer les images PNG à partir des fichiers PlantUML :

```bash
# Installer PlantUML
npm install -g plantuml

# Générer tous les diagrammes
plantuml docs/diagrams/*.puml

# Ou générer un diagramme spécifique
plantuml docs/diagrams/architecture-systeme.puml
```

## Conventions utilisées

- **Couleurs** : Cohérentes avec l'architecture (bleu pour services, vert pour succès, rouge pour erreurs)
- **Stéréotypes** : Utilisation de stéréotypes UML appropriés
- **Nommage** : Noms en français pour les diagrammes métier, anglais pour les composants techniques
- **Détail** : Niveau de détail adapté à chaque type de diagramme

## Correspondance avec le code

Tous les diagrammes reflètent fidèlement l'implémentation actuelle du système :

- Les entités correspondent au schéma Prisma (`src/prisma/schema.prisma`)
- Les services correspondent aux microservices (`src/services/`)
- Les composants frontend correspondent aux composants React (`src/web-client/src/`)
- L'architecture de déploiement correspond à `src/docker-compose.yml`

## Maintenance

Ces diagrammes doivent être mis à jour lorsque :

- De nouvelles entités ou relations sont ajoutées
- L'architecture des services change
- De nouveaux cas d'utilisation sont implémentés
- Les processus métier sont modifiés
