# Kong API Gateway Dockerfile
# Simplified version to avoid permission issues

FROM kong:latest

# Set environment variables
ENV KONG_DATABASE=off \
    KONG_DECLARATIVE_CONFIG=/usr/local/kong/declarative/kong.yml \
    KONG_PROXY_ACCESS_LOG=/dev/stdout \
    KONG_ADMIN_ACCESS_LOG=/dev/stdout \
    KONG_PROXY_ERROR_LOG=/dev/stderr \
    KONG_ADMIN_ERROR_LOG=/dev/stderr \
    KONG_ADMIN_LISTEN="0.0.0.0:8001" \
    KONG_PROXY_LISTEN="0.0.0.0:8000" \
    KONG_LOG_LEVEL=info

# Create directory for configuration
USER root
RUN mkdir -p /usr/local/kong/declarative

# Copy configuration
COPY kong.yml /usr/local/kong/declarative/

# Expose ports
EXPOSE 8000 8001 8443 8444

# Start Kong
CMD ["kong", "docker-start"]
