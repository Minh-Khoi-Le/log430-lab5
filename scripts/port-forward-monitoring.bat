@echo off
echo Starting port forwarding for Prometheus and Grafana...

start cmd /k kubectl port-forward svc/prometheus 9090:9090
start cmd /k kubectl port-forward svc/grafana 3001:3000

echo Port forwarding started:
echo Prometheus: http://localhost:9090
echo Grafana: http://localhost:3001 (login: admin/admin)
echo.
echo Press any key to stop port forwarding...
pause > nul

echo Stopping port forwarding...
taskkill /F /FI "WINDOWTITLE eq *port-forward svc/prometheus*"
taskkill /F /FI "WINDOWTITLE eq *port-forward svc/grafana*"
echo Done. 