#!/bin/bash
set -e

# Create a better UI for our extension
cd /Users/saptak/code/envoygateway-dockerdesktopext/ui

echo "Ensuring node_modules directory exists..."
mkdir -p node_modules

# Update package.json with compatible versions
cat > package.json << 'EOL'
{
  "name": "envoygateway-extension-ui",
  "version": "0.1.0",
  "private": true,
  "dependencies": {
    "@emotion/react": "^11.10.4",
    "@emotion/styled": "^11.10.4",
    "@mui/icons-material": "^5.10.6",
    "@mui/material": "^5.10.8",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.4.1"
  },
  "devDependencies": {
    "@types/node": "^18.8.5",
    "@types/react": "^18.0.21",
    "@types/react-dom": "^18.0.6",
    "@vitejs/plugin-react": "^2.1.0",
    "typescript": "^4.8.4",
    "vite": "^3.1.8"
  },
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  }
}
EOL

echo "Installing dependencies..."
npm install

echo "Ensuring build files are clean..."
rm -rf dist

echo "Building React application..."
npm run build

echo "Copying build files to ui-dist directory..."
cd ..
rm -rf ui-dist
cp -r ui/dist ui-dist

echo "React UI built successfully!"
