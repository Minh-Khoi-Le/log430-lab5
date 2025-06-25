# LOG430 - Store Management Application

## Table of Contents

- [LOG430 - Store Management Application](#log430---store-management-application)
  - [Table of Contents](#table-of-contents)
  - [Description](#description)
  - [Technical Choices](#technical-choices)
  - [Quick Start](#quick-start)
    - [Prerequisites](#prerequisites)
    - [Docker Compose (Simplest)](#docker-compose-simplest)
    - [Kubernetes with Load Balancing](#kubernetes-with-load-balancing)
    - [Kubernetes without Load Balancing](#kubernetes-without-load-balancing)
    - [Testing and Monitoring](#testing-and-monitoring)
  - [Local Development](#local-development)
  - [Load Balancing](#load-balancing)
    - [Architecture](#architecture)
    - [Implementation Details](#implementation-details)
    - [Testing Load Balancing](#testing-load-balancing)
  - [Caching](#caching)
    - [Redis Implementation](#redis-implementation)
    - [Cached Endpoints](#cached-endpoints)
  - [Monitoring](#monitoring)
    - [Accessing Monitoring Tools](#accessing-monitoring-tools)
      - [With Docker Compose:](#with-docker-compose)
      - [With Kubernetes:](#with-kubernetes)
    - [Key Metrics](#key-metrics)
    - [Monitoring During Load Tests](#monitoring-during-load-tests)
  - [Data Management](#data-management)
    - [Default Data Injection](#default-data-injection)
    - [Database Commands](#database-commands)
  - [Testing](#testing)
  - [Project Structure](#project-structure)
  - [Additional Documentation](#additional-documentation)

## Description

This application simulates store management with a modern web interface:

- A React frontend (Vite)
- A Node.js backend (Express, DAO, Prisma/PostgreSQL) with documented REST API
  Both services are orchestrated with **Docker Compose**.
  A **CI/CD** GitHub Actions pipeline automates the build and tests.

## Technical Choices

Frontend: React / Vite / Material UI

Backend: Express (Node.js 20)

Persistence: Prisma ORM / PostgreSQL

Caching: Redis for API response caching

Containerization: Docker Compose (client/server/db)

Orchestration: Kubernetes with Minikube

## Quick Start

### Prerequisites

- **Docker & Docker Compose** installed
- (Optional) Node.js 18+ to run locally outside Docker
- For Kubernetes: Minikube and kubectl installed

### Docker Compose (Simplest)

1. Start the application with Docker Compose:

   ```bash
   docker-compose up --build
   ```

2. Access the application:
   - Frontend: http://localhost:5173
   - API: http://localhost:3000
   - API Documentation: http://localhost:3000/api/docs

### Kubernetes with Load Balancing

1. Start Minikube (if not already running):

   ```bash
   minikube start --driver=docker
   ```

2. Deploy the full stack with load balancing:

   ```bash
   scripts\deploy-with-loadbalancing.bat
   ```

3. Set up port forwarding to access the services:

   ```bash
   scripts\port-forward-all.bat
   ```

4. Access the application:
   - Main App: http://localhost:8080
   - Direct API: http://localhost:8080/api

### Kubernetes without Load Balancing

1. Start Minikube (if not already running):

   ```bash
   minikube start --driver=docker
   ```

2. Deploy the full stack with separate clients:

   ```bash
   scripts\deploy-fixed-server.bat
   ```

3. Set up port forwarding to access the services:

   ```bash
   scripts\port-forward-all.bat
   ```

4. Access the application:
   - Server API: http://localhost:3000
   - Client 1: http://localhost:8081
   - Client 2: http://localhost:8082
   - Client 3: http://localhost:8083

### Testing and Monitoring

1. Set up monitoring port forwarding:

   ```bash
   scripts\port-forward-monitoring.bat
   ```

2. Access monitoring tools:

   - Prometheus: http://localhost:9090
   - Grafana: http://localhost:3001 (login: admin/admin)

3. Test caching performance:

   ```bash
   scripts\test-cache-performance.bat
   ```

4. Test load balancing:

   ```bash
   scripts\test-load-balancing.bat
   ```

5. Run k6 load tests:

   ```bash
   scripts\run-k6-tests.bat
   ```

6. Clean up all Kubernetes resources:
   ```bash
   scripts\cleanup-k8s.bat
   ```

## Local Development

```bash
# To run the server
cd server
npm run start
```

```bash
# To run the web application
cd client
npm run dev
```

## Load Balancing

The application implements load balancing using Kubernetes native capabilities.

### Architecture

```text
                                  ┌──────────────┐
                                  │              │
                               ┌──┤  Server Pod 1│
                               │  │              │
┌──────────────┐  ┌─────────┐  │  └──────────────┘
│              │  │         │  │  ┌──────────────┐
│  Web Browser ├──┤ Ingress ├──┼──┤              │
│              │  │         │  │  │  Server Pod 2│
└──────────────┘  └─────────┘  │  │              │
                               │  └──────────────┘
                               │  ┌──────────────┐
                               │  │              │
                               └──┤  Server Pod 3│
                                  │              │
                                  └──────────────┘
```

### Implementation Details

1. **Server Deployment**:

   - Scaled to 3 replicas for load distribution
   - Each pod is identical and stateless
   - Added pod identification in response headers

2. **Client Deployment**:

   - Single unified deployment with 3 replicas
   - ClusterIP service for internal access

3. **Ingress Controller**:
   - NGINX Ingress routes traffic between services
   - `/api` paths routed to the server service
   - All other paths routed to the client service

### Testing Load Balancing

Run the load test script to verify load balancing is working:

```bash
scripts\test-load-balancing.bat
```

This will:

1. Check that all server pods are running
2. Run a k6 load test that makes requests to the API
3. Track which pod serves each request
4. Display a summary of the distribution of requests across pods

You can manually verify the load balancing by running this command in multiple terminals:

```bash
curl -s -I http://localhost:8080/api/v1/products | findstr X-Serving-Pod
```

## Caching

The application implements Redis caching to improve performance and reduce database load.

### Redis Implementation

Redis is used for caching API responses from critical endpoints. Key features include:

- Read-through caching for GET requests
- Automatic cache invalidation after data changes
- Configurable TTL (Time-To-Live) for cached data
- Docker and Kubernetes ready configuration

### Cached Endpoints

The following endpoint categories use Redis caching:

- **Products**: List and detail views
- **Stores**: Store information and inventory
- **Stock**: Product stock levels
- **Sales**: Sales history and reporting

For more details about caching implementation, see [Caching Documentation](docs/CACHING.md).

## Monitoring

The project integrates Prometheus and Grafana for metrics monitoring:

- **Prometheus**: Collects and stores server metrics
- **Grafana**: Visualizes metrics in customizable dashboards

### Accessing Monitoring Tools

#### With Docker Compose:

- Prometheus UI: http://localhost:9090
- Grafana Dashboard: http://localhost:3001 (login: admin/admin)

#### With Kubernetes:

```bash
# Using the dedicated monitoring script (recommended)
scripts\port-forward-monitoring.bat

# Or manually for individual services
# For Prometheus
kubectl port-forward svc/prometheus 9090:9090

# For Grafana
kubectl port-forward svc/grafana 3001:3000
```

### Key Metrics

1. **Request Rate Overview**

   ```text
   sum(rate(http_request_duration_seconds_count{app="log430-server"}[1m])) by (path)
   ```

   Shows the number of requests per second to each endpoint.

2. **Error Rate Overview**

   ```text
   sum(rate(http_request_duration_seconds_count{app="log430-server", status_code=~"4.*|5.*"}[1m])) / sum(rate(http_request_duration_seconds_count{app="log430-server"}[1m])) * 100
   ```

   Shows the percentage of requests resulting in errors.

3. **Response Time Overview**

   ```text
   histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket{app="log430-server"}[1m])) by (path, le))
   ```

   Shows the 95th percentile response time for each endpoint.

4. **Load Balancing Distribution**

   ```text
   sum by(pod) (rate(requests_total_by_pod[1m]))
   ```

   Shows how requests are distributed across server pods.

### Monitoring During Load Tests

To monitor application performance during load tests:

1. Start monitoring port forwarding:

   ```bash
   scripts\port-forward-monitoring.bat
   ```

2. Run load tests using k6:

   ```bash
   scripts\run-k6-tests.bat
   ```

3. View metrics in Prometheus/Grafana

## Data Management

The server deployment automatically seeds the database on startup if
deploying with Kubernetes.

### Default Data Injection

To have default data:

```bash
# With Docker
docker-compose exec server npm run seed

# Locally
cd server
npm run seed
```

### Database Commands

To reset Prisma migration:

```bash
npx prisma migrate reset
npx prisma migrate dev --name init
```

You need to reseed the data afterward for local developpment.

## Testing

Testing locally:

```bash
cd server
npm test
```

For load testing:

```bash
scripts\run-k6-tests.bat
```

## Project Structure

Execute at the project root to generate the structure:

```bash
treee -l 4 --ignore "node_modules,.git" -o docs\structure.txt
```

## Additional Documentation

- [Script files organization (scripts/)](README-scripts.md)
- [Complete Kubernetes deployment guide](k8s/README.md)
- [Redis caching implementation](docs/CACHING.md)
- [Command Reference](docs/COMMAND-REFERENCE.md)
