import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  AppBar,
  Toolbar,
  Tab,
  Tabs,
  CircularProgress,
  Alert,
  Link,
  Card,
  CardContent,
  CardActions,
  Grid,
  Paper,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Tooltip,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import RefreshIcon from '@mui/icons-material/Refresh';
import SettingsIcon from '@mui/icons-material/Settings';
import PublicIcon from '@mui/icons-material/Public';
import WarningIcon from '@mui/icons-material/Warning';
import BuildIcon from '@mui/icons-material/Build';
import { createDockerDesktopClient } from '@docker/extension-api-client';

interface EnvoyGatewayStatus {
  installed: boolean;
  status?: string;
  version?: string;
}

// Create Docker Desktop client
const client = createDockerDesktopClient();

function useDockerDesktopClient() {
  return client;
}

function App() {
  const ddClient = useDockerDesktopClient();
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [kubernetesEnabled, setKubernetesEnabled] = useState(false);
  const [kubernetesStatus, setKubernetesStatus] = useState<string>('Checking...');
  const [error, setError] = useState<string | null>(null);
  const [installingEnvoyGateway, setInstallingEnvoyGateway] = useState(false);
  const [envoyGatewayStatus, setEnvoyGatewayStatus] = useState<EnvoyGatewayStatus>({
    installed: false,
    version: '',
  });

  // Check the status of Kubernetes and Envoy Gateway
  useEffect(() => {
    checkStatus();
  }, []);

  // Check if Kubernetes is running
  const checkKubernetesStatus = async () => {
    try {
      const output = await ddClient.extension.host?.cli.exec("kubectl", [
        "cluster-info",
        "--request-timeout",
        "2s",
      ]);
      
      if (output?.stderr && output.stderr.length > 0) {
        console.log("Kubernetes check stderr:", output.stderr);
        return false;
      }
      
      return true;
    } catch (err) {
      console.error("Error checking Kubernetes status:", err);
      return false;
    }
  };

  // Check if Envoy Gateway is installed
  const checkEnvoyGatewayStatus = async () => {
    try {
      const output = await ddClient.extension.host?.cli.exec("kubectl", [
        "get",
        "deployment",
        "-n",
        "envoy-gateway-system",
        "envoy-gateway",
        "--ignore-not-found",
      ]);

      const isInstalled = output?.stdout && output.stdout.includes("envoy-gateway");
      
      if (!isInstalled) {
        return {
          installed: false,
          status: "Not Installed",
          version: "",
        };
      }

      // Get Envoy Gateway version
      const versionOutput = await ddClient.extension.host?.cli.exec("kubectl", [
        "get",
        "deployment",
        "-n",
        "envoy-gateway-system",
        "envoy-gateway",
        "-o",
        "jsonpath={.spec.template.spec.containers[0].image}",
      ]);

      let version = "";
      if (versionOutput?.stdout) {
        const parts = versionOutput.stdout.split(":");
        if (parts.length > 1) {
          version = parts[1].trim();
        }
      }

      // Check status
      const statusOutput = await ddClient.extension.host?.cli.exec("kubectl", [
        "get",
        "deployment",
        "-n",
        "envoy-gateway-system",
        "envoy-gateway",
        "-o",
        "jsonpath={.status.conditions[?(@.type==\"Available\")].status}",
      ]);

      let status = "Unknown";
      if (statusOutput?.stdout) {
        status = statusOutput.stdout.trim() === "True" ? "Running" : "Error";
      }

      return {
        installed: true,
        status,
        version,
      };
    } catch (err) {
      console.error("Error checking Envoy Gateway status:", err);
      return {
        installed: false,
        status: "Error checking",
        version: "",
      };
    }
  };

  const checkStatus = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Check Kubernetes status
      const k8sEnabled = await checkKubernetesStatus();
      setKubernetesEnabled(k8sEnabled);
      setKubernetesStatus(k8sEnabled ? 'Kubernetes is running' : 'Kubernetes is not running');
      
      if (!k8sEnabled) {
        setEnvoyGatewayStatus({
          installed: false,
          status: "Kubernetes is not running",
          version: "",
        });
        setLoading(false);
        return;
      }
      
      // Check Envoy Gateway status
      const egStatus = await checkEnvoyGatewayStatus();
      setEnvoyGatewayStatus(egStatus);
      
      setLoading(false);
    } catch (err) {
      console.error('Error checking status:', err);
      setError(`Failed to check status: ${err instanceof Error ? err.message : String(err)}`);
      setLoading(false);
    }
  };

  // Handle tab change
  const handleChangeTab = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  // Handle refresh
  const handleRefresh = () => {
    checkStatus();
  };
  
  // Real implementation for installing Envoy Gateway
  const handleInstall = async () => {
    setInstallingEnvoyGateway(true);
    setError(null);
    
    try {
      const output = await ddClient.extension.host?.cli.exec("kubectl", [
        "apply",
        "-f",
        "https://github.com/envoyproxy/gateway/releases/latest/download/install.yaml",
      ]);
      
      if (output?.stderr && output.stderr.length > 0) {
        throw new Error(`Installation failed: ${output.stderr}`);
      }
      
      // Wait a moment to give Envoy Gateway time to start
      setTimeout(() => {
        // Check the status again to update the UI
        checkStatus();
        setInstallingEnvoyGateway(false);
      }, 2000);
    } catch (err) {
      console.error('Error installing Envoy Gateway:', err);
      setError(`Failed to install Envoy Gateway: ${err instanceof Error ? err.message : String(err)}`);
      setInstallingEnvoyGateway(false);
    }
  };

  // Handle deploying a sample application
  const handleDeploySample = async () => {
    try {
      const output = await ddClient.extension.host?.cli.exec("kubectl", [
        "apply",
        "-f",
        "https://github.com/envoyproxy/gateway/releases/latest/download/quickstart.yaml",
      ]);
      
      if (output?.stderr && output.stderr.length > 0) {
        throw new Error(`Deployment failed: ${output.stderr}`);
      }
      
      // Show success message
      await ddClient.desktopUI.toast.success('Sample application deployed successfully');
    } catch (err) {
      console.error('Error deploying sample:', err);
      await ddClient.desktopUI.toast.error(`Failed to deploy sample application: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // Render the Dashboard tab
  const renderDashboard = () => {
    return (
      <Box>
        <Box mb={3}>
          <Typography variant="h5" gutterBottom>
            Envoy Gateway Dashboard
          </Typography>
          <Typography variant="body1" color="textSecondary">
            Manage Envoy Gateway - an API Gateway based on Envoy Proxy that implements the Kubernetes Gateway API.
          </Typography>
        </Box>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Kubernetes Status
                </Typography>
                <Box display="flex" alignItems="center" mb={1}>
                  {kubernetesEnabled ? (
                    <CheckCircleIcon color="success" sx={{ mr: 1 }} />
                  ) : (
                    <ErrorIcon color="error" sx={{ mr: 1 }} />
                  )}
                  <Typography>
                    {kubernetesEnabled ? 'Enabled' : 'Not Enabled'}
                  </Typography>
                </Box>
                <Typography variant="body2" color="textSecondary">
                  {kubernetesStatus}
                </Typography>
              </CardContent>
              {!kubernetesEnabled && (
                <CardActions>
                  <Button
                    size="small"
                    color="primary"
                    href="https://docs.docker.com/desktop/kubernetes/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Enable Kubernetes
                  </Button>
                </CardActions>
              )}
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Envoy Gateway Status
                </Typography>
                {loading ? (
                  <Box display="flex" justifyContent="center" my={2}>
                    <CircularProgress size={24} />
                  </Box>
                ) : (
                  <>
                    <Box display="flex" alignItems="center" mb={1}>
                      {envoyGatewayStatus.installed ? (
                        <CheckCircleIcon color="success" sx={{ mr: 1 }} />
                      ) : (
                        <WarningIcon color="warning" sx={{ mr: 1 }} />
                      )}
                      <Typography>
                        {envoyGatewayStatus.installed ? 'Installed' : 'Not Installed'}
                      </Typography>
                    </Box>
                    {envoyGatewayStatus.installed && (
                      <>
                        <Typography variant="body2" color="textSecondary">
                          Status: {envoyGatewayStatus.status}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          Version: {envoyGatewayStatus.version}
                        </Typography>
                      </>
                    )}
                  </>
                )}
              </CardContent>
              {!loading && !envoyGatewayStatus.installed && (
                <CardActions>
                  <Button
                    size="small"
                    color="primary"
                    onClick={handleInstall}
                    disabled={installingEnvoyGateway || !kubernetesEnabled}
                  >
                    {installingEnvoyGateway ? <CircularProgress size={24} /> : 'Install Envoy Gateway'}
                  </Button>
                </CardActions>
              )}
            </Card>
          </Grid>
        </Grid>

        {error && (
          <Box mt={3}>
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          </Box>
        )}

        {envoyGatewayStatus.installed && (
          <Box mt={4}>
            <Typography variant="h6" gutterBottom>
              Quick Start
            </Typography>
            <Typography variant="body2" paragraph>
              Follow these steps to get started with Envoy Gateway:
            </Typography>

            <Paper sx={{ p: 3 }}>
              <List>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircleIcon color="success" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Envoy Gateway Installed" 
                    secondary="You've successfully installed Envoy Gateway"
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemIcon>
                    <PublicIcon />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Create a GatewayClass and Gateway" 
                    secondary="Define the Gateway API resources to configure Envoy Gateway"
                  />
                </ListItem>

                <ListItem>
                  <ListItemIcon>
                    <BuildIcon />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Create HTTPRoutes" 
                    secondary="Configure routes to direct traffic to your services"
                  />
                </ListItem>
              </List>
              
              <Box mt={2}>
                <Button 
                  variant="contained" 
                  color="primary"
                  onClick={() => setActiveTab(1)}
                >
                  Go to Setup Guide
                </Button>
              </Box>
            </Paper>
          </Box>
        )}
      </Box>
    );
  };

  // Render the Quickstart tab
  const renderQuickstart = () => {
    return (
      <Box>
        <Typography variant="h5" gutterBottom>
          Quick Setup Guide
        </Typography>
        
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Deploy a sample application with Envoy Gateway
          </Typography>
          
          <Typography variant="body1" paragraph>
            This guide will help you deploy a sample application and configure Envoy Gateway to route traffic to it.
          </Typography>
          
          <Typography variant="subtitle1" gutterBottom>
            1. Deploy the sample application
          </Typography>
          
          <Typography variant="body2" sx={{ fontFamily: 'monospace', bgcolor: 'background.paper', p: 2, mb: 2, overflowX: 'auto' }}>
            kubectl apply -f https://github.com/envoyproxy/gateway/releases/download/latest/quickstart.yaml
          </Typography>
          
          <Typography variant="subtitle1" gutterBottom>
            2. Verify the Gateway is created
          </Typography>
          
          <Typography variant="body2" sx={{ fontFamily: 'monospace', bgcolor: 'background.paper', p: 2, mb: 2, overflowX: 'auto' }}>
            kubectl get gateway -n default
          </Typography>
          
          <Typography variant="subtitle1" gutterBottom>
            3. Verify the HTTPRoute is created
          </Typography>
          
          <Typography variant="body2" sx={{ fontFamily: 'monospace', bgcolor: 'background.paper', p: 2, mb: 2, overflowX: 'auto' }}>
            kubectl get httproute -n default
          </Typography>
          
          <Typography variant="subtitle1" gutterBottom>
            4. Get the Gateway service IP
          </Typography>
          
          <Typography variant="body2" sx={{ fontFamily: 'monospace', bgcolor: 'background.paper', p: 2, mb: 2, overflowX: 'auto' }}>
            kubectl get service -n envoy-gateway-system --selector=gateway.envoyproxy.io/owning-gateway-namespace=default,gateway.envoyproxy.io/owning-gateway-name=eg
          </Typography>
          
          <Box mt={3} display="flex" gap={2}>
            <Button 
              variant="contained" 
              color="primary"
              onClick={handleDeploySample}
            >
              Deploy Sample
            </Button>
            <Button 
              variant="outlined" 
              color="primary"
              href="https://gateway.envoyproxy.io/latest/tasks/quickstart/"
              target="_blank"
              rel="noopener noreferrer"
            >
              View Full Documentation
            </Button>
          </Box>
        </Paper>
      </Box>
    );
  };

  // Render the Resources tab
  const renderResources = () => {
    return (
      <Box>
        <Typography variant="h5" gutterBottom>
          Resources
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Documentation
                </Typography>
                <Typography variant="body2" paragraph>
                  Official documentation for Envoy Gateway.
                </Typography>
                <Link 
                  href="https://gateway.envoyproxy.io/docs/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  View Documentation
                </Link>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  GitHub Repository
                </Typography>
                <Typography variant="body2" paragraph>
                  Source code for Envoy Gateway.
                </Typography>
                <Link 
                  href="https://github.com/envoyproxy/gateway" 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  View on GitHub
                </Link>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Kubernetes Gateway API
                </Typography>
                <Typography variant="body2" paragraph>
                  Learn about the Kubernetes Gateway API.
                </Typography>
                <Link 
                  href="https://gateway-api.sigs.k8s.io/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  View Gateway API Documentation
                </Link>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Envoy Proxy
                </Typography>
                <Typography variant="body2" paragraph>
                  Learn about Envoy Proxy, the foundation of Envoy Gateway.
                </Typography>
                <Link 
                  href="https://www.envoyproxy.io/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  View Envoy Documentation
                </Link>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    );
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static" color="default" elevation={0}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Envoy Gateway
          </Typography>
          <Tooltip title="Refresh">
            <IconButton onClick={handleRefresh} disabled={loading}>
              {loading ? <CircularProgress size={24} /> : <RefreshIcon />}
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      <Box sx={{ width: '100%', bgcolor: 'background.paper' }}>
        <Tabs
          value={activeTab}
          onChange={handleChangeTab}
          centered
        >
          <Tab label="Dashboard" />
          <Tab label="Quick Start" />
          <Tab label="Resources" />
        </Tabs>
      </Box>

      <Box p={3}>
        {activeTab === 0 && renderDashboard()}
        {activeTab === 1 && renderQuickstart()}
        {activeTab === 2 && renderResources()}
      </Box>

      <Box pt={4} pb={2} textAlign="center">
        <Typography variant="body2" color="textSecondary">
          Envoy Gateway Extension for Docker Desktop
        </Typography>
      </Box>
    </Box>
  );
}

export default App;
