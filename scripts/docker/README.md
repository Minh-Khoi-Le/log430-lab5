# Docker Deployment Scripts

This directory contains all scripts for managing the Docker Compose deployment of the LOG430 Lab 5 microservices system.

## Quick Start

```bash
# Interactive menu with all Docker options
scripts\docker\quick-start-docker.bat
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `quick-start-docker.bat` | Interactive menu for all Docker operations |
| `start-gateway.bat` | Start API Gateway and all microservices |
| `start-frontend.bat` | Start the frontend client |
| `stop-gateway.bat` | Stop all services |
| `clean-restart.bat` | Clean restart (removes all data) |
| `test-gateway.bat` | Test gateway functionality and load balancing |
| `system-status.bat` | Check system health and status |
| `view-logs.bat` | View logs from all services |
| `load-test.bat` | Run performance tests |

## Quick Commands

### Start Everything

```bash
scripts\docker\start-gateway.bat
# Wait 2 minutes for services to initialize
scripts\docker\start-frontend.bat
```

### Test the System

```bash
scripts\docker\test-gateway.bat
```

### Stop Everything

```bash
scripts\docker\stop-gateway.bat
```

## Access Points

When running, access the system at:

- **Frontend**: <http://localhost:3000>
- **API Gateway**: <http://localhost:8000>
- **Grafana**: <http://localhost:3001>
- **Prometheus**: <http://localhost:9090>

## Prerequisites

- Docker Desktop installed and running
- At least 4GB RAM available
- Ports 3000, 8000, 8001, 9090, 3001 available

## Troubleshooting

If you encounter issues:

1. Check system status: `scripts\docker\system-status.bat`
2. View logs: `scripts\docker\view-logs.bat`
3. Try clean restart: `scripts\docker\clean-restart.bat`

For more help, use the interactive menu: `scripts\docker\quick-start-docker.bat`
