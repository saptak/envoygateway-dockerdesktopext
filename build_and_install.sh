#!/bin/bash
set -e

echo "Building Envoy Gateway Extension for Docker Desktop"

# Set the working directory
cd /Users/saptak/code/envoygateway-dockerdesktopext

# Build the UI first
echo "Building UI..."
./build_ui.sh

# Define the tag
IMAGE_TAG="docker/envoygateway-extension:latest"

# Build the Docker image
echo "Building Docker image..."
docker build -t $IMAGE_TAG .

# Try to remove an existing extension if it exists
echo "Removing any existing extension..."
docker extension rm envoygateway-extension || true

# Install the extension
echo "Installing the extension..."
docker extension install -f $IMAGE_TAG

echo "Envoy Gateway extension successfully built and installed!"
echo "You can now find it in Docker Desktop Extensions tab."
