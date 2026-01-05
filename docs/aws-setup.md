# AWS Setup Guide

Complete guide for deploying the Rewards App to AWS ECS Fargate.

## Prerequisites

1. **AWS Account**: Active AWS account with billing enabled
2. **mise**: Tool version manager (installs AWS CLI, Terraform, etc.)
3. **GitHub CLI**: For automated secrets setup
4. **Docker**: For local image builds (optional)

All required tools (AWS CLI, Terraform) are defined in `.mise.toml` and installed automatically.

## Tool Installation

### Install mise and tools

```bash
# Install mise (if not already installed)
curl https://mise.run | sh

# Install all project tools (AWS CLI, Terraform, etc.)
mise install
```

## AWS CLI Setup

### Configure Credentials

```bash
aws configure
```

Enter:

- AWS Access Key ID
- AWS Secret Access Key
- Default region: `us-east-1`
- Default output format: `json`

### Verify Configuration

```bash
aws sts get-caller-identity
```

Should output your account ID and ARN.

## Cost Management

### Budget Setup

Terraform automatically creates a budget alert at $10/month threshold.

Update email in `terraform/variables.tf`:

```hcl
variable "budget_email" {
  default = "your-email@example.com"
}
```

### Cost Monitoring

1. **AWS Cost Explorer**: Filter by `Project=rewards-app` tag
2. **Daily Reminder**: GitHub Actions workflow runs daily
3. **Budget Alerts**: Email notifications at 80%, 100%, and forecasted 100%

### Expected Costs

**Demo/Testing** (~$59/month):

- ECS Fargate Spot (2 tasks): ~$9/month
- RDS db.t4g.micro: ~$12/month
- NAT Gateway: ~$32/month
- CloudWatch + Data Transfer: ~$5/month
- S3 + DynamoDB: <$1/month

**Production** (~$200-300/month):

- Fargate On-Demand (4-10 tasks): ~$100-150/month
- RDS Multi-AZ: ~$50/month
- Dual NAT Gateways: ~$65/month
- Enhanced monitoring: ~$10/month

## Deployment Steps

### 1. Bootstrap Infrastructure

Create Terraform state backend:

```bash
cd terraform
./bootstrap.sh
```

This creates:

- S3 bucket for Terraform state
- DynamoDB table for state locking

**Cost**: <$1/month

### 2. Initialize Terraform

```bash
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
terraform init -backend-config="bucket=rewards-app-tf-state-${ACCOUNT_ID}"
```

### 3. Configure Variables

Edit `terraform/variables.tf`:

```hcl
variable "github_org" {
  default = "your-github-username"
}

variable "github_repo" {
  default = "your-repo-name"
}

variable "budget_email" {
  default = "your-email@example.com"
}
```

### 4. Set Rails Master Key

```bash
export TF_VAR_rails_master_key=$(cat api/config/master.key)
```

### 5. Plan and Apply

```bash
terraform plan -out=tfplan
terraform apply tfplan
```

Review the plan carefully before applying.

**Deployment time**: 10-15 minutes (RDS takes longest)

### 6. Setup GitHub Secrets

Automatically configure GitHub repository secrets:

```bash
./setup-github-secrets.sh
```

This configures:

- AWS region and account ID
- OIDC role ARN
- ECR repository URLs
- ECS cluster and service names

### 7. Trigger Deployment

Push to main branch or manually trigger workflow:

```bash
git push origin main
```

Or via GitHub Actions UI: `Actions > Deploy to AWS ECS > Run workflow`

## Verification

### Check Infrastructure

```bash
# ECS cluster
aws ecs describe-clusters --clusters rewards-app-cluster

# Running tasks
aws ecs list-tasks --cluster rewards-app-cluster

# RDS instance
aws rds describe-db-instances --db-instance-identifier rewards-app-db
```

### Get Service URLs

After deployment, GitHub Actions outputs public IPs:

```text
🌐 Web URL: http://1.2.3.4
🚀 API URL: http://5.6.7.8:3000
```

Or fetch manually:

```bash
# Get web task IP
WEB_TASK_ARN=$(aws ecs list-tasks \
  --cluster rewards-app-cluster \
  --service-name rewards-app-web \
  --query 'taskArns[0]' --output text)

WEB_ENI=$(aws ecs describe-tasks \
  --cluster rewards-app-cluster \
  --tasks $WEB_TASK_ARN \
  --query 'tasks[0].attachments[0].details[?name==`networkInterfaceId`].value' \
  --output text)

aws ec2 describe-network-interfaces \
  --network-interface-ids $WEB_ENI \
  --query 'NetworkInterfaces[0].Association.PublicIp' \
  --output text
```

### Test Endpoints

```bash
# Health check
curl http://<api-ip>:3000/health

# Web app
curl http://<web-ip>
```

## Cleanup

### Destroy Infrastructure

```bash
cd terraform
terraform destroy -auto-approve
```

Removes:

- ECS cluster and tasks
- RDS database
- ECR repositories and images
- VPC and networking
- IAM roles and security groups
- Secrets and parameters
- Budget alerts

**Time**: 5-10 minutes

### Delete Backend (Optional)

Only after destroying main infrastructure:

```bash
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
aws s3 rb s3://rewards-app-tf-state-${ACCOUNT_ID} --force
aws dynamodb delete-table --table-name rewards-app-tf-locks
```

## Troubleshooting

### Terraform Errors

#### Error: Backend initialization failed

Ensure bootstrap script ran successfully:

```bash
aws s3 ls | grep rewards-app-tf-state
```

#### Error: Invalid credentials

Reconfigure AWS CLI:

```bash
aws configure
aws sts get-caller-identity
```

### Deployment Failures

#### Migration task failed

Check CloudWatch Logs:

```bash
aws logs tail /ecs/rewards-app/api --follow
```

#### Service not stabilizing

Check task status:

```bash
TASK_ARN=$(aws ecs list-tasks --cluster rewards-app-cluster \
  --query 'taskArns[0]' --output text)
aws ecs describe-tasks --cluster rewards-app-cluster --tasks $TASK_ARN
```

Common issues:

- Health check failing (check `/health` endpoint)
- Database connection issues (verify security groups)
- Missing secrets (check Parameter Store)

### Cost Overruns

#### NAT Gateway costs high

Consider:

- Reduce NAT Gateway usage (move RDS to public subnet for testing)
- Use VPC endpoints for AWS services
- Destroy when not in use

#### Fargate costs high

- Ensure Fargate Spot is enabled (70% cheaper)
- Reduce task count to 1 for testing
- Scale down CPU/memory if possible

## Security Considerations

### Secrets Management

- Rails master key: Parameter Store SecureString
- Database password: Auto-generated, stored in Parameter Store
- GitHub Actions: OIDC (no long-lived credentials)

### Network Security

- RDS in private subnet (no internet access)
- ECS tasks in public subnet (for simplified demo)
- Security groups limit access to necessary ports

### Production Hardening

For production, consider:

1. **Private ECS tasks** with Application Load Balancer
2. **Multi-AZ** RDS for high availability
3. **WAF** for web application firewall
4. **Secrets rotation** via AWS Secrets Manager
5. **VPC Flow Logs** for network monitoring
6. **GuardDuty** for threat detection

## Resource Limits

Default AWS limits may affect deployment:

- **Fargate tasks**: 50 per region (request increase if needed)
- **ECR storage**: 500 GB free tier
- **RDS storage**: 20 GB free tier (first year)
- **NAT Gateway**: 5 per AZ

Check limits:

```bash
aws service-quotas list-service-quotas --service-code ecs
```

Request increases via AWS Support if needed.
