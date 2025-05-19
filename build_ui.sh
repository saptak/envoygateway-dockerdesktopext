#!/bin/bash
set -e

# Create a better UI for our extension
cd /Users/saptak/code/envoygateway-dockerdesktopext/ui

echo "Ensuring node_modules directory exists..."
mkdir -p node_modules

echo "Installing dependencies using Docker..."
docker run --rm -v "$(pwd):/app" -w /app node:18 npm install

echo "Ensuring build files are clean..."
rm -rf dist

echo "Building React application using Docker..."
docker run --rm -v "$(pwd):/app" -w /app node:18 npm run build

echo "Copying build files to ui-dist directory..."
cd ..
rm -rf ui-dist
mkdir -p ui-dist
cp -r ui/dist/* ui-dist/

echo "React UI built successfully!"
