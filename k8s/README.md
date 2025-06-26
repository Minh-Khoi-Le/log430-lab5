# Kubernetes Deployment for LOG430 Lab 5 Microservices

This directory contains the Kubernetes manifests for deploying the complete LOG430 Lab 5 Load Balanced Microservices Architecture.

## Architecture Overview

The Kubernetes deployment includes:

### **Load Balanced Services** (2 instances each)

- **Product Service**: Ports 3001 (product-service-1, product-service-2)
- **Stock Service**: Ports 3004 (stock-service-1, stock-service-2)  
- **Cart Service**: Ports 3007 (cart-service-1, cart-service-2)

### **Single Instance Services**

- **User Service**: Port 3002
- **Store Service**: Port 3003
- **Sales Service**: Port 3005
- **Refund Service**: Port 3006

### **API Gateway**

- **Kong Gateway**: Ports 8000 (proxy), 8001 (admin)
- Load balancing configuration with round-robin algorithm
- API key authentication and rate limiting

### **Infrastructure**

- **PostgreSQL Database**: Port 5432 with persistent storage
- **Redis Cache**: Port 6379 for caching and sessions

### **Frontend**

- **React Client**: Port 5173 (Vite development server)

### **Monitoring**

- **Prometheus**: Port 9090 for metrics collection
- **Grafana**: Port 3100 for dashboards (admin/admin)

## Quick Deployment

### Prerequisites

1. **Minikube** installed and running:

   ```bash
   # Setup Minikube with adequate resources
   scripts\setup-minikube.bat
   ```

2. **Docker** available for building images

### Automated Deployment

```bash
# Deploy complete microservices architecture
scripts\deploy-k8s.bat
```

This script will:

1. Build all Docker images in Minikube environment
2. Deploy infrastructure (PostgreSQL, Redis)
3. Deploy all microservices with load balancing
4. Deploy Kong API Gateway with routing configuration
5. Deploy frontend client
6. Deploy monitoring stack
7. Set up ingress routing
8. Wait for all services to be ready

### Manual Deployment

If you prefer manual control:

```bash
# 1. Infrastructure
kubectl apply -f postgres.yaml
kubectl apply -f redis.yaml

# 2. Microservices
kubectl apply -f product-service.yaml
kubectl apply -f stock-service.yaml  
kubectl apply -f cart-service.yaml
kubectl apply -f single-services.yaml

# 3. API Gateway
kubectl apply -f kong-gateway.yaml

# 4. Frontend
kubectl apply -f client.yaml

# 5. Monitoring
kubectl apply -f monitoring.yaml

# 6. Ingress
kubectl apply -f ingress.yaml
```

## Access Services

### Service URLs

Get service URLs with Minikube:

```bash
# Frontend Application
minikube service client-service --url

# API Gateway
minikube service kong-gateway-service --url

# Monitoring
minikube service prometheus-service --url
minikube service grafana-service --url
```

### Port Forwarding

For consistent local access, use port forwarding:

```bash
# Frontend (http://localhost:5173)
kubectl port-forward service/client-service 5173:5173

# API Gateway (http://localhost:8000)
kubectl port-forward service/kong-gateway-service 8000:8000

# Kong Admin API (http://localhost:8001)  
kubectl port-forward service/kong-gateway-service 8001:8001

# Prometheus (http://localhost:9090)
kubectl port-forward service/prometheus-service 9090:9090

# Grafana (http://localhost:3100)
kubectl port-forward service/grafana-service 3100:3100
```

### Quick Port Forwarding Scripts

```bash
# Set up all port forwarding at once
scripts\port-forward-all.bat

# Set up only monitoring port forwarding
scripts\port-forward-monitoring.bat
```

## Testing the Deployment

### Health Checks

```bash
# Check all pods are running
kubectl get pods

# Check services
kubectl get services

# Check ingress
kubectl get ingress
```

### API Testing

```bash
# Test Kong Gateway health
curl http://localhost:8001/status

# Test microservices through gateway
curl -H "X-API-Key: testing-key-xyz123" http://localhost:8000/api/products/health
curl -H "X-API-Key: testing-key-xyz123" http://localhost:8000/api/stock/health
curl -H "X-API-Key: testing-key-xyz123" http://localhost:8000/api/cart/health

# Test load balancing
for i in {1..10}; do curl -H "X-API-Key: testing-key-xyz123" http://localhost:8000/api/products/health; done
```

### Frontend Testing

1. Open <http://localhost:5173> in your browser
2. Test user registration/login
3. Browse products and add to cart
4. Complete a purchase workflow

## Configuration Details

### Kong Gateway Configuration

The Kong Gateway is configured with:

- **Services**: Routes to all microservices
- **Upstreams**: Load balancing for product, stock, and cart services
- **Plugins**: API key authentication, CORS, rate limiting, Prometheus metrics
- **Consumers**: Frontend app and testing credentials

### Database Configuration

- **Database**: `store_db`
- **User**: `postgres`
- **Password**: `postgres123`
- **Persistent Storage**: 1Gi PVC for data persistence

### Environment Variables

All services are configured with:

- Database connection parameters
- Redis connection parameters  
- Instance identification for load balancing
- Environment-specific settings

## Monitoring and Observability

### Prometheus Metrics

Prometheus is configured to scrape:

- Kong Gateway metrics (port 8001)
- All microservice instances
- Infrastructure services (PostgreSQL, Redis)

### Grafana Dashboards

Access Grafana at <http://localhost:3100> (admin/admin) with:

- Pre-configured Prometheus data source
- System metrics and service health
- Kong Gateway performance metrics

## Troubleshooting

### Common Issues

**Pods not starting**:

```bash
kubectl describe pod <pod-name>
kubectl logs <pod-name>
```

**Service connectivity issues**:

```bash
kubectl get endpoints
kubectl exec -it <pod-name> -- nslookup <service-name>
```

**Image pull issues**:

```bash
# Ensure Docker environment is set for Minikube
FOR /F "tokens=*" %%i IN ('minikube docker-env') DO %%i
# Rebuild images
scripts\deploy-k8s.bat
```

**Resource constraints**:

```bash
# Check node resources
kubectl top nodes
kubectl top pods

# Restart Minikube with more resources
minikube stop
minikube start --memory=4096 --cpus=2
```

### Logs

```bash
# View logs for specific services
kubectl logs deployment/kong-gateway
kubectl logs deployment/product-service-1
kubectl logs deployment/postgres

# Follow logs in real-time
kubectl logs -f deployment/kong-gateway
```

### Resource Status

```bash
# Check deployment status
kubectl get deployments

# Check resource usage
kubectl top pods
kubectl describe node minikube
```

## Cleanup

### Complete Cleanup

```bash
# Remove all LOG430 resources
scripts\cleanup-k8s.bat
```

### Selective Cleanup

```bash
# Remove only application services
kubectl delete deployment kong-gateway product-service-1 product-service-2
kubectl delete service kong-gateway-service product-service-1 product-service-2

# Remove only monitoring
kubectl delete deployment prometheus grafana
kubectl delete service prometheus-service grafana-service
```

## Development Workflow

### Building and Deploying Changes

1. **Make code changes** in services or client
2. **Rebuild images**:

   ```bash
   # Set Minikube Docker env
   FOR /F "tokens=*" %%i IN ('minikube docker-env') DO %%i
   
   # Rebuild specific service
   cd services\product-service
   docker build -t product-service:latest .
   ```

3. **Restart deployment**:

   ```bash
   kubectl rollout restart deployment/product-service-1
   kubectl rollout restart deployment/product-service-2
   ```

### Configuration Updates

1. **Update manifests** in k8s/ directory
2. **Apply changes**:

   ```bash
   kubectl apply -f k8s\product-service.yaml
   ```

## Files Description

| File | Description |
|------|-------------|
| `kong-gateway.yaml` | Kong API Gateway deployment with load balancing config |
| `product-service.yaml` | Product service with 2 load-balanced instances |
| `stock-service.yaml` | Stock service with 2 load-balanced instances |
| `cart-service.yaml` | Cart service with 2 load-balanced instances |
| `single-services.yaml` | User, Store, Sales, and Refund services |
| `postgres.yaml` | PostgreSQL database with persistent storage |
| `redis.yaml` | Redis cache service |
| `client.yaml` | React frontend client |
| `monitoring.yaml` | Prometheus and Grafana monitoring stack |
| `ingress.yaml` | Nginx ingress routing configuration |
| `grafana.yaml` | Legacy Grafana config (replaced by monitoring.yaml) |

## Security Considerations

- **API Keys**: Services require valid API keys for access
- **Network Policies**: Services communicate within cluster network
- **Secrets**: Database credentials should use Kubernetes secrets in production
- **RBAC**: Service accounts should have minimal required permissions

---

**Note**: This deployment is configured for development/testing. For production use, consider:

- Using specific image tags instead of `latest`
- Implementing proper secrets management
- Adding resource quotas and limits
- Setting up persistent volumes for monitoring data
- Configuring network policies for enhanced security

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
   - Server API: <http://localhost:3000>
   - Client 1: <http://localhost:8081>
   - Client 2: <http://localhost:8082>
   - Client 3: <http://localhost:8083>

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
