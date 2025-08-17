# GitHub Repository Variables and Secrets

## 📋 Repository Variables (Settings → Secrets and variables → Actions → Variables)

Add these in the **Variables** tab:

```
Variable Name: GCP_PROJECT_ID
Value: your-gcp-project-id
Description: Your Google Cloud Project ID

Variable Name: GCP_REGION  
Value: us-central1
Description: GCP region for deployment (or your preferred region)

Variable Name: SERVICE_NAME
Value: ms-365-mcp-server
Description: Base name for Cloud Run services
```

## 🔐 Repository Secrets (Settings → Secrets and variables → Actions → Secrets)

Add this in the **Secrets** tab:

```
Secret Name: GCP_SA_KEY
Value: {paste the entire content of your github-actions-key.json file}
Description: GCP Service Account JSON key for authentication
```

## 🌍 Optional Environment-Specific Variables

### For Staging Environment:
Go to **Settings** → **Environments** → **staging** → **Add variable**

```
Variable Name: NODE_ENV
Value: staging

Variable Name: LOG_LEVEL
Value: debug

Variable Name: PORT
Value: 3000
```

### For Production Environment:
Go to **Settings** → **Environments** → **production** → **Add variable**

```
Variable Name: NODE_ENV
Value: production

Variable Name: LOG_LEVEL
Value: info

Variable Name: PORT
Value: 8080
```

## 📝 Quick Copy-Paste Format

**Repository Variables:**
```
GCP_PROJECT_ID = your-actual-project-id
GCP_REGION = us-central1
SERVICE_NAME = ms-365-mcp-server
```

**Repository Secrets:**
```
GCP_SA_KEY = {
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "github-actions@your-project-id.iam.gserviceaccount.com",
  "client_id": "...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/github-actions%40your-project-id.iam.gserviceaccount.com"
}
```

## 🎯 Required vs Optional

### ✅ **Required (Minimum to work):**
- `GCP_PROJECT_ID` (repository variable)
- `GCP_SA_KEY` (repository secret)

### 🔧 **Optional (Uses defaults if not set):**
- `GCP_REGION` (defaults to `us-central1`)
- `SERVICE_NAME` (defaults to `ms-365-mcp-server`)
- Environment-specific variables

## 🚀 How to Add Variables

### Repository Variables/Secrets:
1. Go to your repository on GitHub
2. **Settings** → **Secrets and variables** → **Actions**
3. Click **Variables** tab for variables
4. Click **Secrets** tab for secrets
5. Click **New repository variable** or **New repository secret**
6. Enter name and value
7. Click **Add variable** or **Add secret**

### Environment Variables:
1. **Settings** → **Environments**
2. Click on environment name (staging/production)
3. Click **Add variable** or **Add secret**
4. Enter name and value
5. Click **Add variable** or **Add secret**

## ⚠️ Important Notes

- **Never commit secrets to your code**
- **GCP_SA_KEY must be the entire JSON content** (not just the file path)
- **Replace `your-actual-project-id`** with your real GCP project ID
- **Environment variables override repository variables** for that specific environment
