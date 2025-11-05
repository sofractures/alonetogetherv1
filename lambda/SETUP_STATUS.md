# Setup Status - AWS Lambda + FFmpeg

## ✅ Completed Steps

1. **Serverless Framework installed globally** ✓
   - Version: Check with `serverless --version`

2. **serverless-offline installed locally** ✓
   - Installed in `lambda/` directory

3. **Configuration files prepared** ✓
   - `serverless.yml` configured with:
     - Pre-built FFmpeg layer ARN
     - Lambda Function URL setup
     - Environment variables structure
     - Proper timeout and memory settings

4. **Lambda function code ready** ✓
   - `process_audio.py` with exact FFmpeg filter chain
   - Requirements file prepared

## ⚠️ Manual Steps Required

### 1. Install AWS CLI

**Option A: Using Homebrew (Recommended)**
```bash
# Install Homebrew if not installed
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install AWS CLI
brew install awscli
```

**Option B: Using Official Installer**
```bash
# Download and install (requires sudo password)
cd /tmp
curl "https://awscli.amazonaws.com/AWSCLIV2.pkg" -o "AWSCLIV2.pkg"
sudo installer -pkg AWSCLIV2.pkg -target /
```

**Option C: Using pip (if Python is installed)**
```bash
pip3 install awscli --upgrade
```

### 2. Configure AWS Credentials

After installing AWS CLI, run:

```bash
aws configure
```

You'll need:
- **AWS Access Key ID**: Get from AWS Console → IAM → Users → Security credentials
- **AWS Secret Access Key**: Get from same location (create new if needed)
- **Default region**: `us-east-1` (or your preferred region)
- **Default output format**: `json`

**To create AWS Access Keys:**
1. Go to AWS Console → IAM → Users
2. Select your user (or create new)
3. Security credentials tab
4. Create access key
5. Choose "CLI" as use case
6. Copy Access Key ID and Secret Access Key

### 3. Set Environment Variables

Before deploying, set these environment variables:

```bash
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
```

Or add to your shell profile (`~/.zshrc` or `~/.bash_profile`):

```bash
echo 'export SUPABASE_URL="https://your-project.supabase.co"' >> ~/.zshrc
echo 'export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"' >> ~/.zshrc
source ~/.zshrc
```

### 4. Deploy Lambda Function

Once AWS CLI is configured and environment variables are set:

```bash
cd lambda
serverless deploy
```

This will:
- Create the Lambda function
- Set up Lambda Function URL
- Configure the FFmpeg layer
- Set environment variables

### 5. Get Lambda Function URL

After deployment completes, you'll see output like:

```
endpoints:
  POST - https://xxxxxxxxxx.lambda-url.us-east-1.on.aws/
```

Copy this URL.

### 6. Configure Next.js/Vercel

Add the Lambda Function URL to your environment variables:

**In Vercel:**
1. Go to your project → Settings → Environment Variables
2. Add: `AWS_LAMBDA_FUNCTION_URL` = `https://xxxxxxxxxx.lambda-url.us-east-1.on.aws/`
3. Redeploy

**Or in `.env.local` for local development:**
```bash
AWS_LAMBDA_FUNCTION_URL=https://xxxxxxxxxx.lambda-url.us-east-1.on.aws/
```

## 📋 Quick Command Summary

After completing manual steps:

```bash
# 1. Install AWS CLI (choose one method above)

# 2. Configure AWS credentials
aws configure

# 3. Set environment variables
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# 4. Deploy
cd lambda
serverless deploy

# 5. Copy Lambda Function URL from output and add to Vercel/env
```

## 🧪 Testing

After deployment, test with:

```bash
curl -X POST https://your-lambda-url.lambda-url.us-east-1.on.aws/ \
  -H "Content-Type: application/json" \
  -d '{
    "inputPath": "recordings/test.webm",
    "instrumentalPath": "instrumental.mp3",
    "memoryId": "test-id",
    "supabaseUrl": "https://your-project.supabase.co",
    "supabaseKey": "your-service-role-key"
  }'
```

Or test through your Next.js app - the API route will automatically invoke Lambda.

## 📊 Next Steps

1. ✅ Code is ready
2. ⏳ Install AWS CLI
3. ⏳ Configure AWS credentials
4. ⏳ Set environment variables
5. ⏳ Deploy Lambda function
6. ⏳ Add Lambda URL to Vercel
7. ⏳ Test end-to-end processing

## 🔍 Troubleshooting

If you encounter issues:

- **AWS CLI not found**: Make sure it's in your PATH (`which aws`)
- **Credentials error**: Run `aws configure` again
- **Deployment fails**: Check AWS permissions (need Lambda, IAM, CloudFormation)
- **Layer not found**: The FFmpeg layer ARN might need to be updated for your region

## 📝 Notes

- The FFmpeg layer ARN in `serverless.yml` is for `us-east-1` region
- If deploying to a different region, update the layer ARN
- Find more FFmpeg layers at: https://github.com/serverlessland/ffmpeg-lambda-layer

