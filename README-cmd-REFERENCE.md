# LOG430 Command Reference

This is a quick reference for all available scripts and commands in the LOG430 project.

## Quick Deployment

| Command | Description |
|---------|-------------|
| `docker-compose up --build` | Start using Docker Compose (simplest) |
| `scripts\deploy-with-loadbalancing.bat` | Deploy to K8s with load balancing |
| `scripts\deploy-fixed-server.bat` | Deploy to K8s without load balancing |
| `scripts\cleanup-k8s.bat` | Remove all K8s resources |

## Kubernetes Setup

| Command | Description |
|---------|-------------|
| `minikube start --driver=docker` | Start Minikube |
| `minikube stop` | Stop Minikube |
| `minikube delete` | Delete Minikube cluster |
| `scripts\setup-minikube.bat` | Set up Minikube and build Docker images |
| `scripts\redeploy.bat` | Rebuild images and restart deployments |

## Access and Port Forwarding

| Command | Description |
|---------|-------------|
| `scripts\port-forward-all.bat` | Port forwarding for all services |
| `scripts\port-forward-monitoring.bat` | Port forwarding for monitoring only |
| `kubectl port-forward service/server 3000:3000` | Port forward server API |
| `kubectl port-forward service/client1 8081:80` | Port forward client 1 |

## Testing

| Command | Description |
|---------|-------------|
| `scripts\test-cache-performance.bat` | Test Redis caching performance |
| `scripts\test-load-balancing.bat` | Test K8s load balancing |
| `scripts\run-k6-tests.bat` | Run k6 load tests |
| `cd server && npm test` | Run server unit tests |

## Database Management

| Command | Description |
|---------|-------------|
| `docker-compose exec server npm run seed` | Seed database in Docker |
| `kubectl exec -it <pod-name> -- npm run seed` | Seed database in K8s |
| `cd server && npm run seed` | Seed database locally |
| `cd server && npx prisma migrate reset` | Reset database migrations |

## Monitoring

| Command | Description |
|---------|-------------|
| `kubectl get pods` | List all pods |
| `kubectl get services` | List all services |
| `kubectl logs <pod-name>` | View pod logs |
| `kubectl describe pod <pod-name>` | View detailed pod info |

## Application URLs

### Docker Compose
- Frontend: http://localhost:5173
- API: http://localhost:3000
- API Documentation: http://localhost:3000/api/docs

### Kubernetes with Load Balancing
- Main App: http://localhost:8080
- API: http://localhost:8080/api

### Kubernetes without Load Balancing
- Server API: http://localhost:3000
- Client 1: http://localhost:8081
- Client 2: http://localhost:8082
- Client 3: http://localhost:8083

### Monitoring
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3001 (login: admin/admin)

## Included Scripts

| Script | Purpose |
|--------|---------|
| `deploy-with-loadbalancing.bat` | Deploy with load balancing |
| `deploy-fixed-server.bat` | Deploy without load balancing |
| `cleanup-k8s.bat` | Clean up K8s resources |
| `port-forward-all.bat` | Forward ports for all services |
| `port-forward-monitoring.bat` | Forward ports for monitoring |
| `redeploy.bat` | Rebuild and restart after changes |
| `setup-minikube.bat` | Set up Minikube environment |
| `test-cache-performance.bat` | Test Redis caching |
| `test-load-balancing.bat` | Test load balancing |
| `run-k6-tests.bat` | Run performance tests | 