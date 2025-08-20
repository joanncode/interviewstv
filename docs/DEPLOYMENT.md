# Interviews.tv Deployment Guide

This guide covers deploying Interviews.tv to production environments using Docker, Kubernetes, and cloud platforms.

## 🚀 Deployment Options

### 1. Docker Compose (Simple Deployment)
Best for: Small to medium deployments, single server

### 2. Kubernetes (Scalable Deployment)
Best for: Large scale deployments, high availability

### 3. Cloud Platforms (Managed Services)
Best for: Minimal infrastructure management

## 🐳 Docker Deployment

### Prerequisites
- Docker 20.10+
- Docker Compose 2.0+
- 4GB+ RAM
- 20GB+ disk space

### Quick Production Deployment

```bash
# Clone the repository
git clone https://github.com/interviews-tv/platform.git
cd platform

# Copy production environment
cp .env.production .env

# Configure environment variables
nano .env

# Deploy with production compose
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Run initial setup
docker-compose exec api php artisan migrate --force
docker-compose exec api php artisan db:seed --class=ProductionSeeder
```

### Environment Configuration

```env
# Application
APP_NAME="Interviews.tv"
APP_ENV=production
APP_DEBUG=false
APP_URL=https://interviews.tv

# Database
DB_CONNECTION=mysql
DB_HOST=database
DB_PORT=3306
DB_DATABASE=interviews_tv
DB_USERNAME=interviews_tv
DB_PASSWORD=your_secure_password

# Cache & Sessions
CACHE_DRIVER=redis
SESSION_DRIVER=redis
REDIS_HOST=redis
REDIS_PORT=6379

# File Storage (AWS S3)
FILESYSTEM_DISK=s3
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_DEFAULT_REGION=us-east-1
AWS_BUCKET=interviews-tv-storage

# Email
MAIL_MAILER=smtp
MAIL_HOST=smtp.mailgun.org
MAIL_PORT=587
MAIL_USERNAME=your_username
MAIL_PASSWORD=your_password

# Security
JWT_SECRET=your_jwt_secret_here
CSRF_SECRET=your_csrf_secret_here

# Monitoring
SENTRY_DSN=your_sentry_dsn
```

### SSL Certificate Setup

```bash
# Generate SSL certificates with Let's Encrypt
docker-compose --profile ssl run --rm certbot

# Or use existing certificates
mkdir -p docker/ssl
cp your-cert.pem docker/ssl/
cp your-key.pem docker/ssl/
```

### Backup Configuration

```bash
# Run backup
docker-compose --profile backup run --rm backup

# Restore from backup
docker-compose exec database mysql -u root -p interviews_tv < backups/backup-2024-01-01.sql
```

## ☸️ Kubernetes Deployment

### Prerequisites
- Kubernetes 1.25+
- kubectl configured
- Helm 3.0+
- 8GB+ RAM cluster
- 100GB+ storage

### Cluster Setup

```bash
# Create namespace
kubectl apply -f k8s/namespace.yaml

# Create secrets
kubectl create secret generic mysql-secret \
  --from-literal=username=interviews_tv \
  --from-literal=password=your_secure_password \
  -n interviews-tv

kubectl create secret generic app-secret \
  --from-literal=jwt-secret=your_jwt_secret \
  --from-literal=csrf-secret=your_csrf_secret \
  -n interviews-tv

kubectl create secret generic aws-secret \
  --from-literal=access-key-id=your_access_key \
  --from-literal=secret-access-key=your_secret_key \
  -n interviews-tv

# Deploy infrastructure
kubectl apply -f k8s/mysql-deployment.yaml
kubectl apply -f k8s/redis-deployment.yaml
kubectl apply -f k8s/storage.yaml

# Deploy application
kubectl apply -f k8s/app-deployment.yaml
kubectl apply -f k8s/ingress.yaml

# Wait for deployment
kubectl rollout status deployment/interviews-tv-api -n interviews-tv
```

### Scaling

```bash
# Scale API pods
kubectl scale deployment interviews-tv-api --replicas=5 -n interviews-tv

# Scale queue workers
kubectl scale deployment interviews-tv-queue --replicas=3 -n interviews-tv

# Auto-scaling
kubectl apply -f k8s/hpa.yaml
```

### Monitoring Setup

```bash
# Deploy Prometheus and Grafana
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install prometheus prometheus-community/kube-prometheus-stack -n monitoring --create-namespace

# Deploy application monitoring
kubectl apply -f k8s/monitoring/
```

## ☁️ Cloud Platform Deployment

### AWS EKS Deployment

```bash
# Create EKS cluster
eksctl create cluster \
  --name interviews-tv-production \
  --region us-east-1 \
  --nodegroup-name standard-workers \
  --node-type m5.large \
  --nodes 3 \
  --nodes-min 1 \
  --nodes-max 10 \
  --managed

# Configure kubectl
aws eks update-kubeconfig --region us-east-1 --name interviews-tv-production

# Deploy application
kubectl apply -f k8s/
```

### Google GKE Deployment

```bash
# Create GKE cluster
gcloud container clusters create interviews-tv-production \
  --zone us-central1-a \
  --num-nodes 3 \
  --machine-type n1-standard-2 \
  --enable-autoscaling \
  --min-nodes 1 \
  --max-nodes 10

# Get credentials
gcloud container clusters get-credentials interviews-tv-production --zone us-central1-a

# Deploy application
kubectl apply -f k8s/
```

### Azure AKS Deployment

```bash
# Create resource group
az group create --name interviews-tv-rg --location eastus

# Create AKS cluster
az aks create \
  --resource-group interviews-tv-rg \
  --name interviews-tv-production \
  --node-count 3 \
  --enable-addons monitoring \
  --generate-ssh-keys

# Get credentials
az aks get-credentials --resource-group interviews-tv-rg --name interviews-tv-production

# Deploy application
kubectl apply -f k8s/
```

## 🔄 CI/CD Pipeline

### GitHub Actions Setup

1. **Configure Secrets**:
   ```
   AWS_ACCESS_KEY_ID
   AWS_SECRET_ACCESS_KEY
   DOCKER_REGISTRY_TOKEN
   SLACK_WEBHOOK
   SNYK_TOKEN
   ```

2. **Branch Strategy**:
   - `main` → Production deployment
   - `develop` → Staging deployment
   - `feature/*` → Testing only

3. **Deployment Flow**:
   ```
   Code Push → Tests → Security Scan → Build Image → Deploy → Smoke Tests
   ```

### Manual Deployment

```bash
# Build and tag image
docker build -t interviews-tv/api:v1.0.0 .

# Push to registry
docker push interviews-tv/api:v1.0.0

# Deploy to Kubernetes
kubectl set image deployment/interviews-tv-api api=interviews-tv/api:v1.0.0 -n interviews-tv

# Wait for rollout
kubectl rollout status deployment/interviews-tv-api -n interviews-tv
```

## 📊 Monitoring & Logging

### Application Monitoring

```bash
# Check application health
curl https://api.interviews.tv/health

# View logs
kubectl logs -f deployment/interviews-tv-api -n interviews-tv

# Monitor metrics
kubectl port-forward svc/prometheus-server 9090:80 -n monitoring
```

### Database Monitoring

```bash
# Check database status
kubectl exec -it deployment/mysql -n interviews-tv -- mysql -u root -p -e "SHOW STATUS"

# Monitor slow queries
kubectl exec -it deployment/mysql -n interviews-tv -- mysql -u root -p -e "SHOW PROCESSLIST"
```

### Performance Monitoring

```bash
# View Grafana dashboards
kubectl port-forward svc/grafana 3000:80 -n monitoring

# Check resource usage
kubectl top pods -n interviews-tv
kubectl top nodes
```

## 🔧 Maintenance

### Database Maintenance

```bash
# Run migrations
kubectl exec deployment/interviews-tv-api -n interviews-tv -- php artisan migrate

# Backup database
kubectl exec deployment/mysql -n interviews-tv -- mysqldump -u root -p interviews_tv > backup.sql

# Optimize database
kubectl exec deployment/mysql -n interviews-tv -- mysql -u root -p -e "OPTIMIZE TABLE interviews, users, notifications"
```

### Cache Management

```bash
# Clear application cache
kubectl exec deployment/interviews-tv-api -n interviews-tv -- php artisan cache:clear

# Clear Redis cache
kubectl exec deployment/redis -n interviews-tv -- redis-cli FLUSHALL
```

### Log Rotation

```bash
# Configure log rotation
kubectl apply -f k8s/logging/logrotate-config.yaml

# View log sizes
kubectl exec deployment/interviews-tv-api -n interviews-tv -- du -sh /var/log/*
```

## 🚨 Troubleshooting

### Common Issues

#### Pod Startup Issues
```bash
# Check pod status
kubectl get pods -n interviews-tv

# View pod logs
kubectl logs pod-name -n interviews-tv

# Describe pod for events
kubectl describe pod pod-name -n interviews-tv
```

#### Database Connection Issues
```bash
# Test database connectivity
kubectl exec deployment/interviews-tv-api -n interviews-tv -- php artisan tinker
>>> DB::connection()->getPdo();
```

#### Performance Issues
```bash
# Check resource usage
kubectl top pods -n interviews-tv

# View metrics
kubectl get hpa -n interviews-tv

# Check node resources
kubectl describe nodes
```

### Recovery Procedures

#### Application Recovery
```bash
# Rollback deployment
kubectl rollout undo deployment/interviews-tv-api -n interviews-tv

# Scale down and up
kubectl scale deployment interviews-tv-api --replicas=0 -n interviews-tv
kubectl scale deployment interviews-tv-api --replicas=3 -n interviews-tv
```

#### Database Recovery
```bash
# Restore from backup
kubectl exec -i deployment/mysql -n interviews-tv -- mysql -u root -p interviews_tv < backup.sql

# Repair tables
kubectl exec deployment/mysql -n interviews-tv -- mysql -u root -p -e "REPAIR TABLE interviews"
```

## 📞 Support

- **Documentation**: https://docs.interviews.tv
- **Status Page**: https://status.interviews.tv
- **Support Email**: ops-support@interviews.tv
- **Emergency**: +1-555-SUPPORT

---

**Production deployment checklist:**
- [ ] Environment variables configured
- [ ] SSL certificates installed
- [ ] Database migrations run
- [ ] Monitoring configured
- [ ] Backup strategy implemented
- [ ] Security scanning completed
- [ ] Performance testing passed
- [ ] Documentation updated
