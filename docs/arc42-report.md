# Rapport Arc42 - Système de Gestion de Magasin de Détail (LOG430 Lab 5)

## Table des Matières

1. [Introduction et Objectifs](#1-introduction-et-objectifs)
2. [Contraintes d'Architecture](#2-contraintes-d-architecture)
3. [Contexte et Portée du Système](#3-contexte-et-portée-du-système)
4. [Stratégie de Solution](#4-stratégie-de-solution)
5. [Vue d'Ensemble de l'Architecture](#5-vue-d-ensemble-de-l-architecture)
6. [Vues Runtime](#6-vues-runtime)
7. [Vues de Déploiement](#7-vues-de-déploiement)
8. [Concepts Transversaux](#8-concepts-transversaux)
9. [Décisions d'Architecture](#9-décisions-d-architecture)
10. [Exigences de Qualité](#10-exigences-de-qualité)
11. [Risques et Dettes Techniques](#11-risques-et-dettes-techniques)
12. [Glossaire](#12-glossaire)

---

## 1. Introduction et Objectifs

### 1.1 Aperçu des Exigences

Le système de gestion de magasin de détail développé pour le LOG430 Lab 5 est une application complète basée sur une architecture microservices. Il fournit une solution complète pour la gestion des opérations de vente au détail incluant l'authentification des utilisateurs, le catalogue de produits, le suivi des stocks, les transactions de vente et les fonctionnalités administratives.

### 1.2 Objectifs de Qualité

| Priorité | Objectif de Qualité | Motivation |
|----------|---------------------|------------|
| 1 | **Observabilité** | Surveillance complète avec Prometheus et Grafana pour comprendre le comportement du système |
| 2 | **Évolutivité** | Architecture microservices permettant la mise à l'échelle indépendante des services |
| 3 | **Maintenabilité** | Code TypeScript avec architecture DDD et patterns Clean Architecture |
| 4 | **Performance** | Mise en cache Redis et tests de charge k6 pour optimiser les performances |
| 5 | **Sécurité** | Authentification JWT et contrôle d'accès via Kong Gateway |

### 1.3 Parties Prenantes

| Rôle | Attentes | Responsabilités |
|------|----------|----------------|
| **Développeur** | Code maintenable, architecture claire | Implémentation des fonctionnalités |
| **Administrateur Système** | Déploiement facile, surveillance | Gestion de l'infrastructure |
| **Utilisateur Client** | Interface intuitive, performances | Utilisation des fonctionnalités e-commerce |
| **Utilisateur Admin** | Outils d'analyse, rapports | Gestion du magasin et des produits |

---

## 2. Contraintes d'Architecture

### 2.1 Contraintes Techniques

| Contrainte | Description | Impact |
|------------|-------------|--------|
| **Environnement Docker** | Tous les services doivent être containerisés | Standardisation du déploiement |
| **PostgreSQL** | Base de données relationnelle imposée | Cohérence des données ACID |
| **Node.js + TypeScript** | Stack technologique backend | Écosystème JavaScript unifié |
| **Windows** | Environnement de développement | Scripts .bat pour l'automatisation |

### 2.2 Contraintes Organisationnelles

- **Projet Académique** : Ressources limitées, focus sur l'apprentissage
- **Délai de Développement** : Développement en temps limité
- **Équipe Solo** : Un seul développeur pour l'implémentation complète

### 2.3 Contraintes Conventionnelles

- **Patterns DDD** : Implémentation obligatoire des concepts Domain-Driven Design
- **Architecture Microservices** : Décomposition en services indépendants
- **Surveillance** : Monitoring complet avec les "Four Golden Signals"

---

## 3. Contexte et Portée du Système

### 3.1 Contexte Métier

Le système adresse les besoins d'une chaîne de magasins de détail nécessitant :

- **Gestion Centralisée** : Catalogue de produits unifié
- **Inventaire Multi-Magasins** : Suivi des stocks par localisation
- **Transactions Sécurisées** : Ventes et remboursements avec audit
- **Analyse des Performances** : Métriques et rapports pour la prise de décision

### 3.2 Diagramme de Contexte

``` text
┌─────────────────────────────────────────────────────────────────┐
│                    Système de Gestion de Magasin                │
│                                                                 │
│  ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐ │
│  │   Client Web    │   │   Monitoring    │   │   Kong Gateway  │ │
│  │   (React)       │◄──│   (Prometheus)  │◄──│   (API Gateway) │ │
│  │  localhost:5173 │   │  localhost:9090 │   │  localhost:8000 │ │
│  └─────────────────┘   └─────────────────┘   └─────────────────┘ │
│                                ▲                                │
│                                │                                │
│  ┌─────────────────────────────┼─────────────────────────────┐  │
│  │                             │                             │  │
│  │  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐    │  │
│  │  │User Service │   │Catalog Svc  │   │Transaction  │    │  │
│  │  │   :3001     │   │   :3002     │   │Service :3003│    │  │
│  │  └─────────────┘   └─────────────┘   └─────────────┘    │  │
│  │                         Microservices                   │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                ▲                                │
│  ┌─────────────────────────────┼─────────────────────────────┐  │
│  │                             │                             │  │
│  │  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐    │  │
│  │  │PostgreSQL   │   │   Redis     │   │   Grafana   │    │  │
│  │  │   :5432     │   │   :6379     │   │   :3004     │    │  │
│  │  └─────────────┘   └─────────────┘   └─────────────┘    │  │
│  │                      Infrastructure                     │  │
│  └─────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 3.3 Frontières du Système

**Inclus dans le système :**

- Gestion des utilisateurs et authentification
- Catalogue de produits et inventaire
- Transactions de vente et remboursements
- Surveillance et métriques
- Interface web cliente

**Exclus du système :**

- Intégration avec des systèmes de paiement externes
- Gestion des fournisseurs
- Logistique et livraison
- Systèmes comptables externes

---

## 4. Stratégie de Solution

### 4.1 Approche Architecturale

L'architecture suit une approche **microservices** avec les principes suivants :

1. **Décomposition par Domaine Métier** : Chaque service gère un domaine spécifique
2. **Infrastructure de Base de Données Centralisée** : Couche d'infrastructure partagée avec respect des frontières de domaine
3. **API Gateway Centralisé** : Kong pour la gestion des préoccupations transversales
4. **Surveillance Complète** : Observabilité avec Prometheus et Grafana

### 4.2 Patterns Architecturaux Principaux

| Pattern | Application | Bénéfices |
|---------|-------------|-----------|
| **Microservices** | Décomposition en services indépendants | Évolutivité, maintenabilité |
| **API Gateway** | Kong pour le routage centralisé | Sécurité, surveillance |
| **Domain-Driven Design** | Structure interne des services | Cohérence métier |
| **Clean Architecture** | Séparation des couches | Testabilité, flexibilité |
| **CQRS** | Séparation lecture/écriture | Performance, évolutivité |

### 4.3 Technologies Clés

- **Backend** : Node.js 18+, TypeScript, Express.js
- **Frontend** : React 19, Material-UI v7, Vite 6
- **Base de Données** : PostgreSQL 15, Prisma ORM v5
- **Cache** : Redis 7 pour les performances
- **Surveillance** : Prometheus, Grafana, Four Golden Signals
- **Tests** : k6 pour les tests de charge
- **Containerisation** : Docker, Docker Compose

---

## 5. Vue d'Ensemble de l'Architecture

### 5.1 Décomposition en Microservices

#### 5.1.1 User Service (Port 3001)

**Responsabilités :**

- Authentification et autorisation
- Gestion des profils utilisateur
- Gestion des tokens JWT
- Contrôle d'accès basé sur les rôles (admin/client)

**API Endpoints :**

- `POST /api/auth/login` - Connexion utilisateur
- `POST /api/auth/register` - Inscription utilisateur
- `GET /api/users/profile` - Profil utilisateur

#### 5.1.2 Catalog Service (Port 3002)

**Responsabilités :**

- Gestion du catalogue de produits
- Gestion des informations de magasin
- Suivi des stocks d'inventaire
- Agrégation d'analyses pour le tableau de bord

**API Endpoints :**

- `GET /api/products` - Liste des produits
- `POST /api/products` - Création de produit
- `GET /api/stock/:storeId` - Stock par magasin
- `PUT /api/stock/:storeId/:productId` - Mise à jour stock

#### 5.1.3 Transaction Service (Port 3003)

**Responsabilités :**

- Traitement des transactions de vente
- Gestion des remboursements
- Historique des transactions
- Génération de rapports financiers

**API Endpoints :**

- `POST /api/sales` - Nouvelle vente
- `GET /api/sales/:userId` - Historique des ventes
- `POST /api/refunds` - Demande de remboursement
- `GET /api/refunds/:userId` - Historique des remboursements

### 5.2 Modèle de Données

#### 5.2.1 Entités Principales

```prisma
// Magasin physique
model Store {
  id      Int      @id @default(autoincrement())
  name    String
  address String?
  stocks  Stock[]
  sales   Sale[]
  refunds Refund[]
}

// Produit du catalogue
model Product {
  id          Int           @id @default(autoincrement())
  name        String
  price       Float
  description String?
  stocks      Stock[]
  saleLines   SaleLine[]
  refundLines RefundLine[]
}

// Utilisateur du système
model User {
  id       Int     @id @default(autoincrement())
  name     String  @unique
  role     String  @default("client")
  password String
  sales    Sale[]
  refunds  Refund[]
}

// Transaction de vente
model Sale {
  id         Int        @id @default(autoincrement())
  date       DateTime   @default(now())
  user       User       @relation(fields: [userId], references: [id])
  userId     Int
  store      Store      @relation(fields: [storeId], references: [id])
  storeId    Int
  saleLines  SaleLine[]
  refunds    Refund[]
}
```

### 5.3 Architecture Interne des Services

Chaque microservice suit le pattern **Clean Architecture** avec :

```
services/[service-name]/
├── domain/
│   ├── entities/          # Entités métier
│   ├── repositories/      # Interfaces de persistance
│   └── services/          # Logique métier
├── application/
│   ├── usecases/          # Cas d'usage
│   └── handlers/          # Gestionnaires de requêtes
└── infrastructure/
    ├── repositories/      # Implémentations concrètes
    ├── database/          # Configuration DB
    └── routes/            # Routes Express
```

---

## 6. Vues Runtime

### 6.1 Scénario : Authentification Utilisateur

```mermaid
sequenceDiagram
    participant C as Client Web
    participant K as Kong Gateway
    participant U as User Service
    participant DB as PostgreSQL
    participant R as Redis

    C->>K: POST /api/auth/login
    K->>U: Routage vers User Service
    U->>DB: Vérification credentials
    DB-->>U: Données utilisateur
    U->>U: Génération JWT
    U->>R: Cache session
    U-->>K: JWT + données utilisateur
    K-->>C: Réponse authentification
```

### 6.2 Scénario : Achat de Produit

```mermaid
sequenceDiagram
    participant C as Client Web
    participant K as Kong Gateway
    participant CS as Catalog Service
    participant TS as Transaction Service
    participant DB as PostgreSQL
    participant R as Redis

    C->>K: POST /api/sales (JWT)
    K->>K: Validation JWT
    K->>TS: Routage vers Transaction Service
    TS->>CS: Vérification stock
    CS->>DB: Lecture inventaire
    DB-->>CS: Stock disponible
    CS-->>TS: Confirmation stock
    TS->>DB: Création transaction
    TS->>CS: Mise à jour stock
    CS->>DB: Décrément inventaire
    CS->>R: Invalidation cache
    TS-->>K: Confirmation vente
    K-->>C: Réponse succès
```

### 6.3 Scénario : Génération de Rapport

```mermaid
sequenceDiagram
    participant C as Client Web (Admin)
    participant K as Kong Gateway
    participant CS as Catalog Service
    participant TS as Transaction Service
    participant DB as PostgreSQL

    C->>K: GET /api/analytics/dashboard
    K->>CS: Routage vers Catalog Service
    CS->>DB: Requête agrégation ventes
    CS->>TS: Requête données transactions
    TS->>DB: Lecture historique
    DB-->>TS: Données transactions
    TS-->>CS: Métriques financières
    DB-->>CS: Données inventaire
    CS->>CS: Génération rapport
    CS-->>K: Données dashboard
    K-->>C: Rapport complet
```

---

## 7. Vues de Déploiement

### 7.1 Architecture de Déploiement

```
┌─────────────────────────────────────────────────────────────────┐
│                         Docker Host                              │
│                                                                 │
│  ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐ │
│  │   Frontend      │   │   Kong Gateway  │   │   Monitoring    │ │
│  │   (Local)       │   │   Container     │   │   Stack         │ │
│  │  localhost:5173 │   │  localhost:8000 │   │                 │ │
│  └─────────────────┘   └─────────────────┘   │ ┌─────────────┐ │ │
│                                               │ │ Prometheus  │ │ │
│  ┌─────────────────────────────────────────┐ │ │   :9090     │ │ │
│  │           Microservices Network         │ │ └─────────────┘ │ │
│  │                                         │ │                 │ │
│  │  ┌─────────────┐   ┌─────────────┐    │ │ ┌─────────────┐ │ │
│  │  │User Service │   │Catalog Svc  │    │ │ │  Grafana    │ │ │
│  │  │   :3001     │   │   :3002     │    │ │ │   :3004     │ │ │
│  │  └─────────────┘   └─────────────┘    │ │ └─────────────┘ │ │
│  │                                         │ └─────────────────┘ │
│  │  ┌─────────────┐                       │                     │
│  │  │Transaction  │                       │                     │
│  │  │Service :3003│                       │                     │
│  │  └─────────────┘                       │                     │
│  └─────────────────────────────────────────┘                     │
│                                                                 │
│  ┌─────────────────────────────────────────┐                     │
│  │           Data Layer                    │                     │
│  │                                         │                     │
│  │  ┌─────────────┐   ┌─────────────┐    │                     │
│  │  │PostgreSQL   │   │   Redis     │    │                     │
│  │  │   :5432     │   │   :6379     │    │                     │
│  │  └─────────────┘   └─────────────┘    │                     │
│  └─────────────────────────────────────────┘                     │
└─────────────────────────────────────────────────────────────────┘
```

### 7.2 Configuration Docker Compose

Le déploiement utilise Docker Compose avec les composants suivants :

#### 7.2.1 Services Métier

```yaml
services:
  user-service:
    build: ./services/user-service
    ports: ["3001:3000"]
    environment:
      - DATABASE_URL=postgresql://user:password@postgres:5432/retail
      - REDIS_URL=redis://redis:6379
    depends_on: [postgres, redis]

  catalog-service:
    build: ./services/catalog-service
    ports: ["3002:3000"]
    environment:
      - DATABASE_URL=postgresql://user:password@postgres:5432/retail
      - REDIS_URL=redis://redis:6379
    depends_on: [postgres, redis]

  transaction-service:
    build: ./services/transaction-service
    ports: ["3003:3000"]
    environment:
      - DATABASE_URL=postgresql://user:password@postgres:5432/retail
      - REDIS_URL=redis://redis:6379
    depends_on: [postgres, redis]
```

#### 7.2.2 Infrastructure

```yaml
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: retail
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7
    ports: ["6379:6379"]
    volumes:
      - redis_data:/data

  kong:
    image: kong:3.4
    environment:
      KONG_DATABASE: "off"
      KONG_DECLARATIVE_CONFIG: /kong/declarative/kong.yml
    volumes:
      - ./api-gateway/kong/kong.yml:/kong/declarative/kong.yml
    ports:
      - "8000:8000"
      - "8001:8001"
```

#### 7.2.3 Monitoring

```yaml
  prometheus:
    image: prom/prometheus:latest
    ports: ["9090:9090"]
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'

  grafana:
    image: grafana/grafana:latest
    ports: ["3004:3000"]
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - ./monitoring/grafana:/etc/grafana/provisioning
```

### 7.3 Stratégies de Déploiement

#### 7.3.1 Déploiement de Développement

- **Script** : `quick-start.bat`
- **Approche** : Déploiement complet avec une commande
- **Avantages** : Simplicité, reproductibilité

#### 7.3.2 Déploiement de Production (Recommandé)

- **Orchestration** : Kubernetes avec Helm Charts
- **Monitoring** : Prometheus Operator
- **Sécurité** : Secrets management, RBAC
- **Évolutivité** : Horizontal Pod Autoscaler

---

## 8. Concepts Transversaux

### 8.1 Sécurité

#### 8.1.1 Authentification et Autorisation

- **JWT Tokens** : Tokens stateless pour l'authentification
- **API Keys** : Clés d'API pour l'accès aux services via Kong
- **RBAC** : Contrôle d'accès basé sur les rôles (admin/client)

#### 8.1.2 Sécurité des Communications

- **HTTPS** : Chiffrement des communications (production)
- **CORS** : Configuration appropriée pour les requêtes cross-origin
- **Rate Limiting** : Protection contre les attaques DDoS

### 8.2 Performance et Mise en Cache

#### 8.2.1 Stratégie de Cache Redis

```javascript
// Cache des produits
const cacheKey = `products:${storeId}`;
const cachedProducts = await redis.get(cacheKey);
if (cachedProducts) {
  return JSON.parse(cachedProducts);
}

// Invalidation lors des mises à jour
await redis.del(`products:${storeId}`);
await redis.del(`stock:${storeId}`);
```

#### 8.2.2 Optimisations Base de Données

- **Index** : Index sur les clés étrangères et colonnes de recherche
- **Requêtes Optimisées** : Utilisation d'agrégations SQL
- **Connection Pooling** : Pool de connexions Prisma

### 8.3 Observabilité

#### 8.3.1 Four Golden Signals

1. **Latence** : Temps de réponse des requêtes
2. **Trafic** : Nombre de requêtes par seconde
3. **Erreurs** : Taux d'erreur par endpoint
4. **Saturation** : Utilisation des ressources

#### 8.3.2 Métriques Collectées

```javascript
// Métriques Prometheus
const httpRequestDuration = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code']
});

const httpRequestTotal = new prometheus.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});
```

### 8.4 Gestion des Erreurs

#### 8.4.1 Stratégies de Résilience

- **Circuit Breaker** : Protection contre les cascades de pannes
- **Retry Logic** : Tentatives automatiques en cas d'échec
- **Timeout** : Délais d'attente configurables

#### 8.4.2 Logging Structuré

```javascript
// Logging avec structure JSON
logger.info('User login attempt', {
  userId: user.id,
  timestamp: new Date().toISOString(),
  ip: req.ip,
  userAgent: req.headers['user-agent']
});
```

---

## 9. Décisions d'Architecture

### 9.1 ADR-001 : Architecture Microservices

**Statut** : ACCEPTÉ

**Décision** : Utiliser une architecture microservices avec trois services principaux (User, Catalog, Transaction).

**Justification** :

- Évolutivité indépendante des services
- Isolation des pannes
- Flexibilité technologique
- Équipes autonomes (simulation)

**Conséquences** :

- Complexité de déploiement accrue
- Latence réseau entre services
- Nécessité de monitoring distribué

### 9.2 ADR-002 : Kong API Gateway

**Statut** : ACCEPTÉ

**Décision** : Utiliser Kong Gateway pour le routage et les préoccupations transversales.

**Justification** :

- Centralisation de la sécurité
- Surveillance unifiée
- Gestion du trafic (rate limiting)
- Documentation API

**Conséquences** :

- Point de défaillance unique
- Courbe d'apprentissage
- Configuration additionnelle

### 9.3 ADR-003 : Base de Données Partagée

**Statut** : ACCEPTÉ

**Décision** : Utiliser une base de données PostgreSQL partagée entre les services.

**Justification** :

- Simplicité de déploiement
- Cohérence des données ACID
- Requêtes cross-domaines efficaces
- Contraintes de ressources académiques

**Conséquences** :

- Couplage entre services
- Pas de technologie de base de données spécialisée
- Évolutivité limitée

### 9.4 ADR-004 : Monitoring Prometheus/Grafana

**Statut** : ACCEPTÉ

**Décision** : Utiliser Prometheus pour la collecte de métriques et Grafana pour la visualisation.

**Justification** :

- Standard de l'industrie
- Four Golden Signals
- Alerting intégré
- Écosystème riche

**Conséquences** :

- Courbe d'apprentissage
- Ressources additionnelles
- Configuration complexe

### 9.5 ADR-005 : Stratégie de Cache Redis

**Statut** : ACCEPTÉ

**Décision** : Utiliser Redis pour la mise en cache des réponses API.

**Justification** :

- Amélioration des performances
- Réduction de la charge DB
- Support des sessions
- Simplicité d'intégration

**Conséquences** :

- Complexité de gestion du cache
- Cohérence des données
- Ressource additionnelle

### 9.6 ADR-006 : Infrastructure de Base de Données Centralisée

**Statut** : ACCEPTÉ

**Décision** : Refactoriser l'architecture pour utiliser une infrastructure de base de données centralisée avec des frontières de domaine claires.

**Justification** :

- Standardisation des patterns d'accès aux données
- Optimisation des connexions et performances
- Respect des frontières de domaine via des interfaces repository
- Maintien de la compatibilité API existante
- Amélioration de l'observabilité et du monitoring

**Conséquences** :

- Dépendance vers l'infrastructure partagée
- Complexité de migration temporaire
- Amélioration de la maintenabilité à long terme
- Patterns d'accès aux données plus cohérents

---

## 10. Exigences de Qualité

### 10.1 Scénarios de Qualité

#### 10.1.1 Performance

| Scénario | Métrique | Objectif | Mesure |
|----------|----------|----------|---------|
| Temps de réponse API | Latence p95 | < 200ms | Tests k6 |
| Débit transactions | TPS | > 100 req/s | Tests de charge |
| Temps de chargement UI | First Contentful Paint | < 1s | Lighthouse |

#### 10.1.2 Disponibilité

| Scénario | Métrique | Objectif | Mesure |
|----------|----------|----------|---------|
| Uptime système | Disponibilité | > 99% | Prometheus |
| Récupération panne | MTTR | < 5min | Monitoring |
| Détection problème | MTTD | < 1min | Alerting |

#### 10.1.3 Sécurité

| Scénario | Métrique | Objectif | Mesure |
|----------|----------|----------|---------|
| Authentification | Taux d'échec | < 0.1% | Logs |
| Autorisation | Accès non autorisé | 0 | Audit |
| Rate limiting | Requêtes bloquées | > 95% | Kong métriques |

### 10.2 Architecture de Test

#### 10.2.1 Tests de Charge k6

```javascript
// Scénario de montée en charge
export let options = {
  stages: [
    { duration: '5m', target: 50 },   // Montée graduelle
    { duration: '10m', target: 100 }, // Charge normale
    { duration: '5m', target: 200 },  // Pic de charge
    { duration: '10m', target: 100 }, // Retour normal
    { duration: '5m', target: 0 },    // Arrêt graduel
  ],
  thresholds: {
    'http_req_duration': ['p95<200'],
    'http_req_failed': ['rate<0.1'],
  },
};
```

#### 10.2.2 Tests End-to-End

```javascript
// Parcours utilisateur complet
export default function() {
  // 1. Login
  let loginResponse = http.post(`${BASE_URL}/api/auth/login`, {
    name: 'client',
    password: 'client123'
  });
  
  // 2. Consultation catalogue
  let products = http.get(`${BASE_URL}/api/products`);
  
  // 3. Achat
  let sale = http.post(`${BASE_URL}/api/sales`, {
    storeId: 1,
    items: [{ productId: 1, quantity: 2 }]
  });
  
  check(sale, {
    'sale successful': (r) => r.status === 201,
    'response time OK': (r) => r.timings.duration < 500,
  });
}
```

---

## 11. Risques et Dettes Techniques

### 11.1 Risques Identifiés

#### 11.1.1 Risques Techniques

| Risque | Probabilité | Impact | Mitigation |
|--------|-------------|--------|------------|
| **Panne Kong Gateway** | Moyenne | Élevé | Health checks, load balancer |
| **Surcharge PostgreSQL** | Élevée | Moyen | Connection pooling, cache |
| **Épuisement Redis** | Faible | Moyen | Eviction policies, monitoring |
| **Latence réseau** | Élevée | Faible | Optimisation requêtes, cache |

#### 11.1.2 Risques Opérationnels

| Risque | Probabilité | Impact | Mitigation |
|--------|-------------|--------|------------|
| **Complexité déploiement** | Élevée | Moyen | Scripts automatisés, documentation |
| **Debugging distribué** | Élevée | Élevé | Tracing distribué, logging centralisé |
| **Gestion des secrets** | Moyenne | Élevé | Gestionnaire de secrets, rotation |

### 11.2 Dettes Techniques

#### 11.2.1 Dettes Architecturales

- **Base de données partagée** : Migration vers DB par service
- **Communication synchrone** : Introduction de messaging asynchrone
- **Absence de service discovery** : Implémentation Consul/Eureka
- **Pas de circuit breaker** : Ajout de Hystrix/Resilience4j

#### 11.2.2 Dettes de Code

- **Tests unitaires manquants** : Couverture < 50%
- **Validation d'entrée** : Schemas de validation incomplets
- **Documentation API** : Spécifications OpenAPI manquantes
- **Logging standardisé** : Format et niveaux incohérents

#### 11.2.3 Dettes d'Infrastructure

- **Secrets en dur** : Variables d'environnement en clair
- **Absence de backup** : Stratégie de sauvegarde manquante
- **SSL/TLS** : HTTPS non configuré
- **Monitoring alerting** : Règles d'alerte basiques

### 11.3 Plan de Remédiation

#### 11.3.1 Priorité Élevée (0-3 mois)

1. **Implémentation des tests unitaires** (Coverage > 80%)
2. **Configuration HTTPS** pour la production
3. **Gestion des secrets** avec Docker Secrets
4. **Alerting avancé** avec Prometheus AlertManager

---

## 12. Glossaire

### 12.1 Termes Métier

| Terme | Définition |
|-------|------------|
| **Catalogue** | Ensemble des produits disponibles à la vente |
| **Inventaire** | Stock de produits disponibles par magasin |
| **Transaction** | Opération de vente ou de remboursement |
| **Ligne de vente** | Article individuel dans une transaction |
| **Tableau de bord** | Interface d'analyse pour les administrateurs |

### 12.2 Termes Techniques

| Terme | Définition |
|-------|------------|
| **API Gateway** | Point d'entrée unique pour toutes les requêtes client |
| **Circuit Breaker** | Pattern de résilience pour prévenir les cascades de pannes |
| **DDD** | Domain-Driven Design - Approche de conception centrée sur le domaine |
| **Four Golden Signals** | Latence, Trafic, Erreurs, Saturation - Métriques clés |
| **JWT** | JSON Web Token - Standard pour l'authentification |
| **RBAC** | Role-Based Access Control - Contrôle d'accès basé sur les rôles |
| **SLI** | Service Level Indicator - Indicateur de niveau de service |
| **SLO** | Service Level Objective - Objectif de niveau de service |

### 12.3 Acronymes

| Acronyme | Signification |
|----------|---------------|
| **ACID** | Atomicity, Consistency, Isolation, Durability |
| **CORS** | Cross-Origin Resource Sharing |
| **CQRS** | Command Query Responsibility Segregation |
| **DTO** | Data Transfer Object |
| **HTTP** | HyperText Transfer Protocol |
| **JSON** | JavaScript Object Notation |
| **MTTR** | Mean Time To Recovery |
| **MTTD** | Mean Time To Detection |
| **ORM** | Object-Relational Mapping |
| **REST** | Representational State Transfer |
| **SQL** | Structured Query Language |
| **TPS** | Transactions Per Second |
| **UI** | User Interface |
| **UX** | User Experience |

---

## Conclusion

Ce rapport Arc42 présente une architecture microservices complète pour un système de gestion de magasin de détail. L'architecture privilégie l'observabilité, la performance et la maintenabilité tout en respectant les contraintes du projet académique.

Les décisions architecturales prises (Kong Gateway, base de données partagée, monitoring Prometheus/Grafana) offrent un bon équilibre entre complexité et fonctionnalité pour un projet d'apprentissage.

Les risques identifiés et les dettes techniques fournissent une roadmap claire pour l'évolution future du système vers une architecture de production robuste.

**Auteur** : Minh Khoi Le
**Date** : 2025-07-08
**Version** : 1.0
