package k8s

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os/exec"
	"strings"

	"github.com/labstack/echo/v4"
	"github.com/sirupsen/logrus"
)

// Client provides methods to interact with Kubernetes
type Client struct {
	log *logrus.Logger
}

// GatewayStatus represents the status of Envoy Gateway
type GatewayStatus struct {
	Installed bool   `json:"installed"`
	Status    string `json:"status"`
	Version   string `json:"version"`
}

// Gateway represents a Kubernetes Gateway
type Gateway struct {
	Name      string `json:"name"`
	Namespace string `json:"namespace"`
	Class     string `json:"class"`
	Status    string `json:"status"`
	Listeners int    `json:"listeners"`
}

// Route represents a Kubernetes HTTPRoute
type Route struct {
	Name      string `json:"name"`
	Namespace string `json:"namespace"`
	Hostnames string `json:"hostnames"`
	Status    string `json:"status"`
}

// NewClient creates a new Kubernetes client
func NewClient() (*Client, error) {
	return &Client{
		log: logrus.New(),
	}, nil
}

// GetStatus returns the status of Envoy Gateway
func (c *Client) GetStatus(ctx echo.Context) error {
	// Check if Kubernetes is running
	kubectlCmd := exec.Command("kubectl", "version", "--short")
	kubectlOutput, err := kubectlCmd.CombinedOutput()
	if err != nil {
		c.log.Errorf("Failed to check Kubernetes status: %v", err)
		return ctx.JSON(http.StatusInternalServerError, map[string]string{
			"error": fmt.Sprintf("Failed to check Kubernetes status: %v", err),
		})
	}

	c.log.Infof("Kubernetes status: %s", string(kubectlOutput))

	// Check if Envoy Gateway is installed
	egCmd := exec.Command("kubectl", "get", "deployment", "-n", "envoy-gateway-system", "envoy-gateway", "--ignore-not-found")
	egOutput, err := egCmd.CombinedOutput()
	if err != nil {
		c.log.Errorf("Failed to check Envoy Gateway status: %v", err)
		return ctx.JSON(http.StatusInternalServerError, map[string]string{
			"error": fmt.Sprintf("Failed to check Envoy Gateway status: %v", err),
		})
	}

	c.log.Infof("Envoy Gateway check: %s", string(egOutput))

	status := GatewayStatus{
		Installed: len(egOutput) > 0,
		Status:    "NotInstalled",
		Version:   "",
	}

	if status.Installed {
		// Get Envoy Gateway status
		statusCmd := exec.Command("kubectl", "get", "deployment", "-n", "envoy-gateway-system", "envoy-gateway", "-o", "jsonpath={.status.conditions[?(@.type==\"Available\")].status}")
		statusOutput, err := statusCmd.CombinedOutput()
		if err != nil {
			c.log.Errorf("Failed to get Envoy Gateway status: %v", err)
		} else {
			c.log.Infof("Envoy Gateway status: %s", string(statusOutput))
			if strings.TrimSpace(string(statusOutput)) == "True" {
				status.Status = "Running"
			} else {
				status.Status = "Error"
			}
		}

		// Get Envoy Gateway version
		versionCmd := exec.Command("kubectl", "get", "deployment", "-n", "envoy-gateway-system", "envoy-gateway", "-o", "jsonpath={.spec.template.spec.containers[0].image}")
		versionOutput, err := versionCmd.CombinedOutput()
		if err != nil {
			c.log.Errorf("Failed to get Envoy Gateway version: %v", err)
		} else {
			c.log.Infof("Envoy Gateway version: %s", string(versionOutput))
			parts := strings.Split(string(versionOutput), ":")
			if len(parts) > 1 {
				status.Version = parts[1]
			}
		}
	}

	return ctx.JSON(http.StatusOK, status)
}

// InstallEnvoyGateway installs Envoy Gateway on the Kubernetes cluster
func (c *Client) InstallEnvoyGateway(ctx echo.Context) error {
	// Check if Kubernetes is running
	kubectlCmd := exec.Command("kubectl", "version", "--short")
	_, err := kubectlCmd.CombinedOutput()
	if err != nil {
		c.log.Errorf("Failed to check Kubernetes status: %v", err)
		return ctx.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Kubernetes is not running. Please enable Kubernetes in Docker Desktop.",
		})
	}

	// Install Envoy Gateway
	installCmd := exec.Command("kubectl", "apply", "-f", "https://github.com/envoyproxy/gateway/releases/download/latest/install.yaml")
	installOutput, err := installCmd.CombinedOutput()
	if err != nil {
		c.log.Errorf("Failed to install Envoy Gateway: %v, output: %s", err, string(installOutput))
		return ctx.JSON(http.StatusInternalServerError, map[string]string{
			"error": fmt.Sprintf("Failed to install Envoy Gateway: %v", err),
		})
	}

	c.log.Infof("Envoy Gateway installation output: %s", string(installOutput))

	return ctx.JSON(http.StatusOK, map[string]string{
		"message": "Envoy Gateway installed successfully",
	})
}

// GetGateways returns a list of Gateways
func (c *Client) GetGateways(ctx echo.Context) error {
	// Check if Kubernetes Gateway API is installed
	gatewayCmd := exec.Command("kubectl", "get", "crd", "gateways.gateway.networking.k8s.io", "--ignore-not-found")
	gatewayOutput, err := gatewayCmd.CombinedOutput()
	if err != nil {
		c.log.Errorf("Failed to check Gateway API: %v", err)
		return ctx.JSON(http.StatusInternalServerError, map[string]string{
			"error": fmt.Sprintf("Failed to check Gateway API: %v", err),
		})
	}

	if len(gatewayOutput) == 0 {
		c.log.Info("Gateway API not installed")
		return ctx.JSON(http.StatusOK, []Gateway{})
	}

	// Get all Gateways
	cmd := exec.Command("kubectl", "get", "gateways", "--all-namespaces", "-o", "json")
	output, err := cmd.CombinedOutput()
	if err != nil {
		c.log.Errorf("Failed to get Gateways: %v, output: %s", err, string(output))
		return ctx.JSON(http.StatusInternalServerError, map[string]string{
			"error": fmt.Sprintf("Failed to get Gateways: %v", err),
		})
	}

	c.log.Infof("Gateway list output: %s", string(output))

	// Parse the output
	var response map[string]interface{}
	if err := json.Unmarshal(output, &response); err != nil {
		c.log.Errorf("Failed to parse Gateway response: %v", err)
		return ctx.JSON(http.StatusInternalServerError, map[string]string{
			"error": fmt.Sprintf("Failed to parse Gateway response: %v", err),
		})
	}

	// Extract Gateway information
	items, ok := response["items"].([]interface{})
	if !ok {
		c.log.Info("No Gateways found")
		return ctx.JSON(http.StatusOK, []Gateway{})
	}

	var gateways []Gateway
	for _, item := range items {
		gateway, ok := item.(map[string]interface{})
		if !ok {
			continue
		}
		
		metadata, ok := gateway["metadata"].(map[string]interface{})
		if !ok {
			continue
		}
		
		spec, ok := gateway["spec"].(map[string]interface{})
		if !ok {
			continue
		}

		name, _ := metadata["name"].(string)
		namespace, _ := metadata["namespace"].(string)
		gatewayClassName, _ := spec["gatewayClassName"].(string)

		// Get status
		status := "Unknown"
		listeners := 0
		if statusObj, ok := gateway["status"].(map[string]interface{}); ok {
			if listenersObj, ok := statusObj["listeners"].([]interface{}); ok {
				listeners = len(listenersObj)
				status = "Ready"
			}
		}

		gateways = append(gateways, Gateway{
			Name:      name,
			Namespace: namespace,
			Class:     gatewayClassName,
			Status:    status,
			Listeners: listeners,
		})
	}

	return ctx.JSON(http.StatusOK, gateways)
}

// GetRoutes returns a list of HTTP Routes
func (c *Client) GetRoutes(ctx echo.Context) error {
	// Check if Kubernetes HTTPRoute API is installed
	routeCmd := exec.Command("kubectl", "get", "crd", "httproutes.gateway.networking.k8s.io", "--ignore-not-found")
	routeOutput, err := routeCmd.CombinedOutput()
	if err != nil {
		c.log.Errorf("Failed to check HTTPRoute API: %v", err)
		return ctx.JSON(http.StatusInternalServerError, map[string]string{
			"error": fmt.Sprintf("Failed to check HTTPRoute API: %v", err),
		})
	}

	if len(routeOutput) == 0 {
		c.log.Info("HTTPRoute API not installed")
		return ctx.JSON(http.StatusOK, []Route{})
	}

	// Get all HTTP Routes
	cmd := exec.Command("kubectl", "get", "httproutes", "--all-namespaces", "-o", "json")
	output, err := cmd.CombinedOutput()
	if err != nil {
		c.log.Errorf("Failed to get HTTPRoutes: %v, output: %s", err, string(output))
		return ctx.JSON(http.StatusInternalServerError, map[string]string{
			"error": fmt.Sprintf("Failed to get HTTPRoutes: %v", err),
		})
	}

	c.log.Infof("HTTPRoute list output: %s", string(output))

	// Parse the output
	var response map[string]interface{}
	if err := json.Unmarshal(output, &response); err != nil {
		c.log.Errorf("Failed to parse HTTPRoute response: %v", err)
		return ctx.JSON(http.StatusInternalServerError, map[string]string{
			"error": fmt.Sprintf("Failed to parse HTTPRoute response: %v", err),
		})
	}

	// Extract Route information
	items, ok := response["items"].([]interface{})
	if !ok {
		c.log.Info("No HTTPRoutes found")
		return ctx.JSON(http.StatusOK, []Route{})
	}

	var routes []Route
	for _, item := range items {
		route, ok := item.(map[string]interface{})
		if !ok {
			continue
		}
		
		metadata, ok := route["metadata"].(map[string]interface{})
		if !ok {
			continue
		}
		
		spec, ok := route["spec"].(map[string]interface{})
		if !ok {
			continue
		}

		name, _ := metadata["name"].(string)
		namespace, _ := metadata["namespace"].(string)

		// Get hostnames
		hostnames := ""
		if hostnamesObj, ok := spec["hostnames"].([]interface{}); ok && len(hostnamesObj) > 0 {
			hostnameStrs := make([]string, len(hostnamesObj))
			for i, h := range hostnamesObj {
				if hostnameStr, ok := h.(string); ok {
					hostnameStrs[i] = hostnameStr
				}
			}
			hostnames = strings.Join(hostnameStrs, ", ")
		}

		routes = append(routes, Route{
			Name:      name,
			Namespace: namespace,
			Hostnames: hostnames,
			Status:    "Active", // Default status
		})
	}

	return ctx.JSON(http.StatusOK, routes)
}

// DeploySample deploys a sample application with Envoy Gateway
func (c *Client) DeploySample(ctx echo.Context) error {
	// Check if Kubernetes is running
	kubectlCmd := exec.Command("kubectl", "version", "--short")
	_, err := kubectlCmd.CombinedOutput()
	if err != nil {
		c.log.Errorf("Failed to check Kubernetes status: %v", err)
		return ctx.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Kubernetes is not running. Please enable Kubernetes in Docker Desktop.",
		})
	}

	// Check if Envoy Gateway is installed
	egCmd := exec.Command("kubectl", "get", "deployment", "-n", "envoy-gateway-system", "envoy-gateway", "--ignore-not-found")
	egOutput, err := egCmd.CombinedOutput()
	if err != nil {
		c.log.Errorf("Failed to check Envoy Gateway status: %v", err)
		return ctx.JSON(http.StatusInternalServerError, map[string]string{
			"error": fmt.Sprintf("Failed to check Envoy Gateway status: %v", err),
		})
	}

	if len(egOutput) == 0 {
		c.log.Error("Envoy Gateway is not installed")
		return ctx.JSON(http.StatusBadRequest, map[string]string{
			"error": "Envoy Gateway is not installed. Please install it first.",
		})
	}

	// Deploy sample application
	deployCmd := exec.Command("kubectl", "apply", "-f", "https://github.com/envoyproxy/gateway/releases/download/latest/quickstart.yaml")
	deployOutput, err := deployCmd.CombinedOutput()
	if err != nil {
		c.log.Errorf("Failed to deploy sample application: %v, output: %s", err, string(deployOutput))
		return ctx.JSON(http.StatusInternalServerError, map[string]string{
			"error": fmt.Sprintf("Failed to deploy sample application: %v", err),
		})
	}

	c.log.Infof("Sample application deployment output: %s", string(deployOutput))

	return ctx.JSON(http.StatusOK, map[string]string{
		"message": "Sample application deployed successfully",
	})
}
