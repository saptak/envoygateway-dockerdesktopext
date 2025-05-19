# syntax=docker/dockerfile:1

FROM --platform=$BUILDPLATFORM golang:1.20-alpine AS builder
WORKDIR /backend
COPY backend/cmd cmd
COPY backend/internal internal
COPY backend/go.mod ./
RUN go mod download && go mod tidy
ARG TARGETOS TARGETARCH
RUN CGO_ENABLED=0 GOOS=$TARGETOS GOARCH=$TARGETARCH go build -o bin/envoygateway-extension ./cmd/envoygateway

FROM alpine:3.18
LABEL org.opencontainers.image.title="Envoy Gateway" \
    org.opencontainers.image.description="A Docker Desktop extension for managing Envoy Gateway" \
    org.opencontainers.image.vendor="Docker" \
    com.docker.desktop.extension.api.version="0.3.4" \
    com.docker.extension.icon="https://gateway.envoyproxy.io/img/envoy-gateway.svg" \
    com.docker.extension.screenshots="[{\"alt\":\"Envoy Gateway\",\"url\":\"https://gateway.envoyproxy.io/img/envoy-gateway.svg\"}]" \
    com.docker.extension.detailed-description="Manage Envoy Gateway directly from Docker Desktop" \
    com.docker.extension.publisher-url="https://gateway.envoyproxy.io" \
    com.docker.extension.additional-urls="[{\"title\":\"Documentation\",\"url\":\"https://gateway.envoyproxy.io/docs/\"},{\"title\":\"Source code\",\"url\":\"https://github.com/envoyproxy/gateway\"}]" \
    com.docker.extension.categories="kubernetes,networking" \
    com.docker.extension.changelog="Initial version of the Envoy Gateway extension"

# Install kubectl
RUN apk add --no-cache curl bash && \
    curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl" && \
    chmod +x kubectl && \
    mv kubectl /usr/local/bin/

# Copy UI and metadata
COPY ui-dist ui
COPY docker.svg .
COPY metadata.json .

# Copy backend binary
COPY --from=builder /backend/bin/envoygateway-extension /usr/local/bin/

# Add executable permission
RUN chmod +x /usr/local/bin/envoygateway-extension

# Command to run
CMD ["/usr/local/bin/envoygateway-extension"]