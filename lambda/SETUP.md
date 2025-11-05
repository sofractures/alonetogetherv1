# AWS Lambda + FFmpeg Setup Guide

This guide will help you set up AWS Lambda with FFmpeg for high-quality audio processing.

## Prerequisites

1. AWS Account (free tier available)
2. AWS CLI installed and configured
3. Node.js (for Serverless Framework)
4. Python 3.11 (for Lambda function)

## Step 1: Install Serverless Framework

```bash
npm install -g serverless
npm install --save-dev serverless-offline
```

## Step 2: Set Up AWS Credentials

```bash
aws configure
# Enter your AWS Access Key ID
# Enter your AWS Secret Access Key
# Enter default region (e.g., us-east-1)
# Enter default output format (json)
```

## Step 3: Create FFmpeg Layer for Lambda

You have two options:

### Option A: Use Pre-built FFmpeg Layer (Easiest)

1. Find a pre-built FFmpeg layer:
   - Search: "aws lambda ffmpeg layer"
   - Popular: `serverlessland/ffmpeg` layer ARNs
   - Example: `arn:aws:lambda:us-east-1:153977547602:layer:ffmpeg:1`

2. Update `serverless.yml` with the layer ARN:
   ```yaml
   custom:
     ffmpegLayerArn: arn:aws:lambda:us-east-1:153977547602:layer:ffmpeg:1
   ```

### Option B: Build Your Own FFmpeg Layer

1. Create a directory structure:
   ```bash
   mkdir -p ffmpeg-layer/bin
   cd ffmpeg-layer
   ```

2. Download FFmpeg binary for Lambda (Amazon Linux 2):
   ```bash
   # Download FFmpeg static build
   wget https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz
   tar -xf ffmpeg-release-amd64-static.tar.xz
   cp ffmpeg-*-amd64-static/ffmpeg bin/
   chmod +x bin/ffmpeg
   ```

3. Create layer zip:
   ```bash
   zip -r ../ffmpeg-layer.zip .
   ```

4. Upload to Lambda:
   ```bash
   aws lambda publish-layer-version \
     --layer-name ffmpeg \
     --zip-file fileb://../ffmpeg-layer.zip \
     --compatible-runtimes python3.11
   ```

5. Copy the returned LayerVersionArn and update `serverless.yml`

## Step 4: Configure Environment Variables

Update `serverless.yml` with your Supabase credentials:

```yaml
provider:
  environment:
    SUPABASE_URL: https://your-project.supabase.co
    SUPABASE_SERVICE_ROLE_KEY: your-service-role-key
```

Or set them via AWS Console after deployment.

## Step 5: Deploy Lambda Function

```bash
cd lambda
serverless deploy
```

This will:
- Create the Lambda function
- Set up API Gateway endpoint
- Configure the FFmpeg layer
- Set environment variables

## Step 6: Get Lambda Function URL

After deployment, you'll see output like:

```
endpoints:
  POST - https://xxxxxxxxxx.lambda-url.us-east-1.on.aws/process-audio
```

Copy this URL.

## Step 7: Configure Next.js Environment Variables

Add to your Vercel project environment variables:

```bash
AWS_LAMBDA_FUNCTION_URL=https://xxxxxxxxxx.lambda-url.us-east-1.on.aws/process-audio
```

Or update `.env.local` for local development:

```bash
AWS_LAMBDA_FUNCTION_URL=https://xxxxxxxxxx.lambda-url.us-east-1.on.aws/process-audio
```

## Step 8: Test the Function

You can test locally using the Next.js API route, or directly:

```bash
curl -X POST https://your-lambda-url.lambda-url.us-east-1.on.aws/process-audio \
  -H "Content-Type: application/json" \
  -d '{
    "inputPath": "recordings/test.webm",
    "instrumentalPath": "instrumental.mp3",
    "memoryId": "test-id",
    "supabaseUrl": "https://your-project.supabase.co",
    "supabaseKey": "your-service-role-key"
  }'
```

## Step 9: Monitor Lambda Function

View logs in AWS CloudWatch:

```bash
serverless logs -f processAudio --tail
```

Or via AWS Console:
- Lambda → Functions → processAudio → Monitor → View CloudWatch logs

## Troubleshooting

### FFmpeg not found
- Verify layer ARN is correct
- Check layer is in same region as Lambda
- Ensure layer is compatible with Python 3.11

### Timeout errors
- Increase timeout in `serverless.yml` (max 15 minutes)
- Increase memory (3008 MB recommended for FFmpeg)

### Memory errors
- Increase memorySize in `serverless.yml`
- Check file sizes (Lambda has 512MB temp storage limit)

### Permission errors
- Verify Supabase service role key has storage access
- Check IAM role has necessary permissions

## Cost Estimation

- **Free tier**: 1M requests/month, 400,000 GB-seconds
- **After free tier**: ~$0.20 per 1M requests
- **Processing**: ~$0.0000166667 per GB-second
- **Estimated cost for 10,000 processes/month**: $0-5 (mostly free tier)

## Updating the Function

After making changes:

```bash
cd lambda
serverless deploy function -f processAudio
```

Or redeploy entire stack:

```bash
serverless deploy
```

## Removing Resources

To clean up all AWS resources:

```bash
serverless remove
```

---

**Note**: Make sure your `instrumental.mp3` is in the Supabase `assets` bucket before testing.

