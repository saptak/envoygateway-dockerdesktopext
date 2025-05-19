#!/bin/bash
set -e

echo "Testing Envoy Gateway Extension for Docker Desktop"

# Check if the extension is installed
echo "Checking if the extension is installed..."
if ! docker extension ls | grep -q "envoygateway-extension"; then
  echo "Error: Envoy Gateway extension is not installed."
  echo "Please run ./build_and_install.sh first."
  exit 1
fi

echo "Extension is installed."

# Check if Kubernetes is enabled in Docker Desktop
echo "Checking if Kubernetes is enabled..."
if ! kubectl version --short > /dev/null 2>&1; then
  echo "Warning: Kubernetes is not enabled in Docker Desktop."
  echo "Please enable Kubernetes in Docker Desktop settings."
  echo "Then restart Docker Desktop before using the extension."
fi

echo "Verifying extension functionality:"
echo "- The extension should appear in Docker Desktop's Extensions tab"
echo "- The UI should show tabs for Dashboard, Quick Start, and Resources"
echo "- If Kubernetes is enabled, the Dashboard should show the Kubernetes status as Enabled"
echo "- If Envoy Gateway is not installed, you should see an Install button"

echo "To install Envoy Gateway, click the Install button in the Dashboard tab."
echo "To deploy a sample application, go to the Quick Start tab and click the Deploy Sample button."

echo "Testing complete."
echo "You can now use the extension in Docker Desktop."
