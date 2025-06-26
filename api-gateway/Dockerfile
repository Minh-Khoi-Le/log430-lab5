# Kong API Gateway Dockerfile
# Production-ready Kong setup with declarative configuration

FROM kong:3.4.2-alpine

# Set environment variables
ENV KONG_DATABASE=off \
    KONG_DECLARATIVE_CONFIG=/usr/local/kong/declarative/kong.yml \
    KONG_PROXY_ACCESS_LOG=/dev/stdout \
    KONG_ADMIN_ACCESS_LOG=/dev/stdout \
    KONG_PROXY_ERROR_LOG=/dev/stderr \
    KONG_ADMIN_ERROR_LOG=/dev/stderr \
    KONG_ADMIN_LISTEN="0.0.0.0:8001" \
    KONG_PROXY_LISTEN="0.0.0.0:8000" \
    KONG_LOG_LEVEL=info \
    KONG_PLUGINS="bundled,prometheus"

# Create directories for configuration
RUN mkdir -p /usr/local/kong/declarative

# Copy Kong configuration
COPY kong.yml /usr/local/kong/declarative/kong.yml

# Ensure proper permissions
RUN chown -R kong:kong /usr/local/kong/declarative

# Switch to kong user for security
USER kong

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD kong health || exit 1

# Expose ports
# 8000: Proxy port (main API gateway)
# 8001: Admin API port (management)
# 8444: Proxy SSL port
# 8443: Admin SSL port
EXPOSE 8000 8001 8444 8443

# Start Kong
CMD ["kong", "docker-start"]
