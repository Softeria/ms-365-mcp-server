# GCP Deployment Setup Guide

## 🚀 Quick Setup for GCP Deployment

### 1. Create GCP Service Account

```bash
# Set your project ID
export PROJECT_ID="your-gcp-project-id"

# Create service account
gcloud iam service-accounts create github-actions \
    --description="Service account for GitHub Actions" \
    --display-name="GitHub Actions"

# Grant necessary permissions
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:github-actions@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/run.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:github-actions@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/storage.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:github-actions@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/iam.serviceAccountUser"

# Create and download key
gcloud iam service-accounts keys create github-actions-key.json \
    --iam-account=github-actions@$PROJECT_ID.iam.gserviceaccount.com
```

### 2. Configure GitHub Repository

#### Required Repository Variables:
- `GCP_PROJECT_ID`: Your GCP project ID (e.g., `my-project-123`)
- `GCP_REGION`: Deployment region (e.g., `us-central1`)

#### Required Repository Secrets:
- `GCP_SA_KEY`: Content of `github-actions-key.json` file

### 3. Create GitHub Environments

**Create two environments in GitHub:**

1. Go to **Settings** → **Environments**
2. Click **New environment**
3. Create **staging** environment
   - No protection rules needed (auto-deploys)
4. Create **production** environment  
   - Add protection rules (optional):
     - Required reviewers
     - Wait timer
     - Deployment branches (restrict to `main`)

### 4. How to Set Variables and Secrets

**In GitHub Repository:**
1. Go to **Settings** → **Secrets and variables** → **Actions**
2. **Variables tab**: Add repository variables
3. **Secrets tab**: Add repository secrets

### 5. Project Detection Logic

The workflow detects your GCP project using this priority:
1. Repository variable `GCP_PROJECT_ID` (recommended)
2. Falls back to `ms-365-mcp-server` if not set

### 6. Deployment Flow

**Environment-based deployment:**
- `develop` branch → **staging** environment → `ms-365-mcp-server-staging`
- `main` branch → **production** environment → `ms-365-mcp-server`

**Workflow structure:**
```
build (always) → deploy-staging (develop only)
                → deploy-production (main only)
```

### 6. Enable Required GCP APIs

```bash
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
```

## 🛠️ Alternative: Workload Identity (More Secure)

Instead of service account keys, you can use Workload Identity:

```bash
# Enable Workload Identity
gcloud iam workload-identity-pools create "github-pool" \
    --location="global" \
    --display-name="GitHub Actions Pool"

# Create provider
gcloud iam workload-identity-pools providers create-oidc "github-provider" \
    --location="global" \
    --workload-identity-pool="github-pool" \
    --display-name="GitHub Provider" \
    --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository" \
    --issuer-uri="https://token.actions.githubusercontent.com"
```

Then update the workflow to use:
```yaml
- name: Authenticate to Google Cloud
  uses: google-github-actions/auth@v2
  with:
    workload_identity_provider: 'projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/github-pool/providers/github-provider'
    service_account: 'github-actions@PROJECT_ID.iam.gserviceaccount.com'
```

## 🎯 Minimal Configuration Summary

**What you need:**
1. GCP Project ID
2. Service account with Cloud Run permissions  
3. GitHub secrets configured
4. Push to `main` or `develop` branch

**That's it!** The workflow handles everything else automatically.
