package main

import (
	"os"
	"os/signal"
	"syscall"

	"github.com/docker/envoygateway-extension/internal/k8s"
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	"github.com/sirupsen/logrus"
)

func main() {
	// Initialize logger
	log := logrus.New()
	log.SetOutput(os.Stdout)
	log.SetLevel(logrus.InfoLevel)

	// Initialize Kubernetes client
	k8sClient, err := k8s.NewClient()
	if err != nil {
		log.Fatalf("Failed to create Kubernetes client: %v", err)
	}

	// Initialize API server
	e := echo.New()
	e.HideBanner = true
	e.Use(middleware.CORS())
	e.Use(middleware.Logger())
	e.Use(middleware.Recover())

	// Check if socket address was passed as an argument
	socketPath := "/run/guest-services/extension-envoygateway-extension.sock"
	if len(os.Args) > 1 {
		socketPath = os.Args[1]
	}

	log.Infof("Starting server with socket path: %s", socketPath)

	// Register API endpoints
	api := e.Group("/api")
	api.GET("/status", k8sClient.GetStatus)
	api.GET("/gateways", k8sClient.GetGateways)
	api.GET("/routes", k8sClient.GetRoutes)
	api.POST("/install", k8sClient.InstallEnvoyGateway)
	api.POST("/deploy-sample", k8sClient.DeploySample)

	// Start API server
	go func() {
		log.Infof("Starting server on %s", socketPath)
		if err := e.Start("unix://" + socketPath); err != nil {
			log.Fatalf("Failed to start server: %v", err)
		}
	}()

	// Wait for interrupt signal to gracefully shut down the server
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Info("Shutting down server")
}
