#!/bin/bash
set -e

echo "Building Envoy Gateway Extension for Docker Desktop"

# Set the working directory
cd /Users/saptak/code/envoygateway-dockerdesktopext

# Build the UI first
echo "Building UI..."
./build_ui.sh

# Create builder instance if it doesn't exist
if ! docker buildx ls | grep -q envoygateway-builder; then
  echo "Creating buildx builder instance..."
  docker buildx create --name envoygateway-builder --use
fi

# Define the tag
IMAGE_TAG="docker/envoygateway-extension:latest"

# Build the Docker image (using multi-platform build)
echo "Building Docker image..."
docker buildx build --builder envoygateway-builder --platform linux/amd64 -t $IMAGE_TAG --load .

# Try to remove an existing extension if it exists
echo "Removing any existing extension..."
docker extension rm docker/envoygateway-extension || true

# Install the extension
echo "Installing the extension..."
docker extension install -f $IMAGE_TAG

echo "Envoy Gateway extension successfully built and installed!"
echo "You can now find it in Docker Desktop Extensions tab."
