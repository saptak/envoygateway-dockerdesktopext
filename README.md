# Envoy Gateway Extension for Docker Desktop

This extension allows users to easily manage Envoy Gateway directly from Docker Desktop.

## Features

- Dashboard showing Kubernetes and Envoy Gateway status
- Quick installation of Envoy Gateway with a single click
- Deploy sample applications using Envoy Gateway
- Configure Gateways and Routes using the Kubernetes Gateway API
- Access resources and documentation

## Prerequisites

- Docker Desktop with Kubernetes enabled
- kubectl installed

## Installation

### Build from Source

1. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/envoygateway-dockerdesktopext.git
   cd envoygateway-dockerdesktopext
   ```

2. Run the build and install script:
   ```bash
   ./build_and_install.sh
   ```

3. Verify the installation:
   ```bash
   ./test.sh
   ```

## Usage

1. Enable Kubernetes in Docker Desktop if not already enabled
2. Open Docker Desktop
3. Click on "Extensions" in the left sidebar
4. Find and click on "Envoy Gateway"
5. Follow the instructions in the UI to install Envoy Gateway and deploy sample applications

## Development

### Project Structure

- `/ui` - React frontend
- `/backend` - Go backend
- `/build_ui.sh` - Script to build the React UI
- `/build_and_install.sh` - Script to build and install the extension
- `/test.sh` - Script to test the extension

### Building the UI

```bash
./build_ui.sh
```

### Building and Installing the Extension

```bash
./build_and_install.sh
```

## About Envoy Gateway

[Envoy Gateway](https://gateway.envoyproxy.io/) is an open-source project that simplifies the usage of Envoy as an API Gateway. It implements the Kubernetes Gateway API and provides:

- Advanced traffic management
- Enhanced observability
- Security features
- Integration with Kubernetes

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the Apache 2.0 License - see the LICENSE file for details.
