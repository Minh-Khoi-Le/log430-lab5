# Kubernetes Deployment Scripts

This directory contains all scripts for managing the Kubernetes deployment of the LOG430 Lab 5 microservices system.

## Quick Start

```bash
# Interactive menu with all Kubernetes options
scripts\kubernetes\quick-start-k8s.bat
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `quick-start-k8s.bat` | Interactive menu for all Kubernetes operations |
| `setup-minikube.bat` | Setup Minikube environment |
| `deploy-k8s.bat` | Deploy all services to Kubernetes |
| `cleanup-k8s.bat` | Remove all Kubernetes resources |
| `port-forward-all.bat` | Forward ports for all services |
| `port-forward-monitoring.bat` | Forward ports for monitoring services only |
| `system-status.bat` | Check Kubernetes system status |

## Step-by-Step Setup

### 1. Setup Environment
```bash
scripts\kubernetes\setup-minikube.bat
```

### 2. Deploy Services
```bash
scripts\kubernetes\deploy-k8s.bat
```

### 3. Access Services
```bash
scripts\kubernetes\port-forward-all.bat
```

## Access Points

After port forwarding is active:

- **Frontend**: http://localhost:3000
- **API Gateway**: http://localhost:8000
- **Grafana**: http://localhost:3001
- **Prometheus**: http://localhost:9090

## Prerequisites

- **Docker Desktop** with Kubernetes enabled, OR
- **Minikube** installed
- **kubectl** command-line tool installed
- At least 6GB RAM available for Minikube

## Useful Commands

### Check Status
```bash
kubectl get pods
kubectl get services
kubectl get deployments
```

### View Logs
```bash
kubectl logs -f deployment/product-service
kubectl logs -f deployment/kong-gateway
```

### Scale Services
```bash
kubectl scale deployment/product-service --replicas=3
```

## Troubleshooting

### Common Issues

1. **Minikube not starting**
   - Try: `minikube delete && minikube start`
   - Ensure virtualization is enabled in BIOS

2. **Services not accessible**
   - Check port forwarding is running
   - Verify services are deployed: `kubectl get pods`

3. **Pods failing to start**
   - Check logs: `kubectl logs [pod-name]`
   - Check resources: `kubectl describe pod [pod-name]`

### Debug Commands
```bash
# Check system status
scripts\kubernetes\system-status.bat

# View all resources
kubectl get all

# Restart deployment
kubectl rollout restart deployment/[service-name]
```

For more help, use the interactive menu: `scripts\kubernetes\quick-start-k8s.bat`
