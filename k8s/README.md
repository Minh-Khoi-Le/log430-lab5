# Kubernetes Setup for LOG430 Lab

This directory contains the Kubernetes manifests for deploying the LOG430 application.

## Components

- **PostgreSQL Database**: Deployed with a persistent volume
- **Redis**: Cache server for improved performance
- **Server**: Node.js backend service with automatic database seeding
- **Clients**: Three frontend instances accessible via different NodePorts

## Quick Start

1. Start Minikube:

   ```bash
   minikube start --driver=docker
   ```

2. Choose one of the automated deployment scripts:

   ```bash
   # For deployment with load balancing
   scripts\deploy-with-loadbalancing.bat

   # For deployment without load balancing (fixed server)
   scripts\deploy-fixed-server.bat
   ```

   Or build and deploy manually:

   ```bash
   scripts\setup-minikube.bat

   kubectl apply -f k8s/postgres.yaml
   kubectl apply -f k8s/redis.yaml
   kubectl apply -f k8s/fixed-server.yaml
   kubectl apply -f k8s/client1.yaml -f k8s/client2.yaml -f k8s/client3.yaml
   ```

4. Launch port forwarding for all services:

   ```bash
   scripts\port-forward-all.bat
   ```

5. Access your application:
   - Server API: http://localhost:3000
   - Client 1: http://localhost:8081
   - Client 2: http://localhost:8082
   - Client 3: http://localhost:8083

## Utility Scripts

The project includes several helpful scripts in the `scripts` directory:

| Script                     | Description                                                  |
| -------------------------- | ------------------------------------------------------------ |
| `setup-minikube.bat`       | Sets up Minikube environment and builds Docker images        |
| `deploy-with-loadbalancing.bat` | Deploys the application with load balancing using ingress |
| `deploy-fixed-server.bat`  | Deploys the application without load balancing (fixed server) |
| `cleanup-k8s.bat`          | Removes all deployed Kubernetes resources                    |
| `redeploy.bat`             | Rebuilds Docker images and restarts all deployments          |
| `port-forward-all.bat`     | Sets up port forwarding for all services in separate windows |
| `port-forward-monitoring.bat` | Sets up port forwarding for Prometheus and Grafana only   |
| `test-load-balancing.bat`  | Tests the load balancing implementation                      |
| `test-cache-performance.bat` | Tests Redis caching performance                             |

## Database Seeding

The server deployment automatically seeds the database on startup. The seeding process:

1. Cleans up existing data in correct order (respects foreign key relationships)
2. Creates sample products, stores, users
3. Generates stocks for each product in each store
4. Creates sample sales transactions

If you need to modify the seeding behavior:

1. Edit the `server/seed.js` file
2. Rebuild and redeploy with `scripts\redeploy.bat`

## Accessing the Application

### Method 1: All-in-one Port Forwarding (Recommended)

Simply run:

```bash
scripts\port-forward-all.bat
```

This opens separate terminal windows for each service with proper port forwarding.

### Method 2: Manual Port Forwarding

For individual services:

```bash
# For server API
kubectl port-forward service/server 3000:3000

# For client apps
kubectl port-forward service/client1 8081:80
kubectl port-forward service/client2 8082:80
kubectl port-forward service/client3 8083:80
```

### Method 3: NodePort Access

Access the clients directly through NodePort:

```bash
# Get the Minikube IP
minikube ip
```

Then visit:

- Client 1: <http://minikube-ip:30001>
- Client 2: <http://minikube-ip:30002>
- Client 3: <http://minikube-ip:30003>

## Troubleshooting

### Viewing Logs

```bash
# Get pod names
kubectl get pods

# View logs from a pod
kubectl logs <pod-name>

# For more logs
kubectl logs <pod-name> --tail=50
```

## Stopping the Cluster

To stop the Kubernetes cluster:

```bash
minikube stop
```

To delete the cluster:

```bash
minikube delete
```

## Redis Caching

The application uses Redis for API response caching to improve performance:

1. **Caching Configuration**:
   - Redis service is deployed with the `redis.yaml` manifest
   - Server is configured to connect to Redis via environment variables

2. **Testing Caching**:
   To verify the caching is working correctly:

   ```bash
   scripts\test-cache-performance.bat
   ```

   This will show request times for cached vs. non-cached requests.

3. **Monitoring Cache Performance**:
   - Redis cache hits/misses are available in Prometheus metrics
   - Cache statistics are available through Grafana dashboards
