# syntax=docker/dockerfile:1

FROM alpine:3.18
LABEL org.opencontainers.image.title="Envoy Gateway" \
    org.opencontainers.image.description="A Docker Desktop extension for managing Envoy Gateway" \
    org.opencontainers.image.vendor="Docker" \
    com.docker.desktop.extension.api.version="0.3.4" \
    com.docker.desktop.extension.icon="https://gateway.envoyproxy.io/img/envoy-gateway.svg" \
    com.docker.extension.screenshots="[{\"alt\":\"Envoy Gateway\",\"url\":\"https://gateway.envoyproxy.io/img/envoy-gateway.svg\"}]" \
    com.docker.extension.detailed-description="Manage Envoy Gateway directly from Docker Desktop" \
    com.docker.extension.publisher-url="https://gateway.envoyproxy.io" \
    com.docker.extension.additional-urls="[{\"title\":\"Documentation\",\"url\":\"https://gateway.envoyproxy.io/docs/\"},{\"title\":\"Source code\",\"url\":\"https://github.com/envoyproxy/gateway\"}]" \
    com.docker.extension.categories="kubernetes,networking" \
    com.docker.extension.changelog="Initial version of the Envoy Gateway extension"

# Install kubectl
RUN apk add --no-cache curl && \
    curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl" && \
    chmod +x kubectl && \
    mv kubectl /usr/local/bin/

# Copy UI and metadata
COPY ui-dist ui
COPY docker.svg .
COPY metadata.json .

# Create a placeholder script instead of building the Go backend
RUN echo '#!/bin/sh\necho "Envoy Gateway Extension"\nwhile true; do sleep 3600; done' > /usr/local/bin/envoygateway-extension && \
    chmod +x /usr/local/bin/envoygateway-extension

# Command to run
CMD ["/usr/local/bin/envoygateway-extension"]
