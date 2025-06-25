# Script Files Organization

This document explains the organization of all script files for the LOG430 lab application.

## Location

All script files have been organized into a central directory for better management:

```
scripts/
```

## Available Script Files

| Script File                   | Purpose                                                     | Used For                                  |
| ----------------------------- | ----------------------------------------------------------- | ----------------------------------------- |
| `setup-minikube.bat`          | Sets up Minikube environment and builds Docker images       | Initial setup for Kubernetes deployment   |
| `port-forward-all.bat`        | Sets up port forwarding for server, clients, and monitoring | Accessing all services during development |
| `port-forward-monitoring.bat` | Sets up port forwarding for Prometheus and Grafana only     | Monitoring-only access                    |
| `redeploy.bat`                | Rebuilds Docker images and restarts deployments             | Deploying code changes                    |
| `run-k6-tests.bat`            | Runs k6 load tests                                          | Performance testing                       |
| `test-load-balancing.bat`     | Tests the load balancing implementation                     | Verifying load balancer functionality     |

## Usage

Execute scripts from the project root directory:

```bash
scripts\setup-minikube.bat
```

## Kubernetes Deployment Process

For deploying to Kubernetes, follow these steps:

1. **Initial Setup**:

   ```bash
   scripts\setup-minikube.bat
   ```

2. **Deploy your application**:

   ```bash
   # Apply Kubernetes configurations
   kubectl apply -f k8s/postgres.yaml
   kubectl apply -f k8s/fixed-server.yaml
   kubectl apply -f k8s/client.yaml    # For load-balanced version
   kubectl apply -f k8s/ingress.yaml   # For load-balanced version
   ```

3. **Access your application**:

   ```bash
   scripts\port-forward-all.bat
   ```

4. **Test load balancing** (if using the load-balanced version):

   ```bash
   scripts\test-load-balancing.bat
   ```

5. **Redeploy after code changes**:

   ```bash
   scripts\redeploy.bat
   ```

## Docker Compose Deployment

For standard Docker Compose deployment:

```bash
# Start the application
docker-compose up -d

# Run tests
scripts\run-k6-tests.bat
```
