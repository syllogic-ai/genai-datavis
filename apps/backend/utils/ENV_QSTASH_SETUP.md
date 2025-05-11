# QStash Environment Setup

This document outlines the environment variables needed for the QStash implementation.

## Required Environment Variables

Add the following variables to your `.env.local` file in the `apps/backend` directory:

```
# QStash Configuration
QSTASH_TOKEN=your_qstash_token
QSTASH_CURRENT_SIGNING_KEY=your_qstash_current_signing_key
QSTASH_NEXT_SIGNING_KEY=your_qstash_next_signing_key
API_URL=https://your-api-url.com  # Base URL where your API is accessible (for QStash callbacks)
```

## How to Get QStash Credentials

1. **Create an Upstash Account**:
   - Sign up at [upstash.com](https://upstash.com/) if you don't have an account

2. **Create a QStash Instance**:
   - From the Upstash dashboard, navigate to QStash section
   - Create a new QStash instance

3. **Get Your QStash Token**:
   - In your QStash instance dashboard, find the "REST API" section
   - Copy the token value for the `QSTASH_TOKEN` environment variable

4. **Get Signing Keys**:
   - In your QStash dashboard, navigate to Settings > Signing Keys
   - Copy the current signing key for `QSTASH_CURRENT_SIGNING_KEY`
   - Copy the next signing key for `QSTASH_NEXT_SIGNING_KEY`

5. **Set API_URL**:
   - This should be the publicly accessible URL of your API
   - For example: `https://api.your-app.com`
   - During local development, you can use a tunneling service like ngrok

## Installing QStash Python SDK

You'll need to install the QStash SDK for Python:

```bash
pip install qstash
```

And add it to your requirements.txt:

```
qstash>=1.0.0
```

## Testing Your Configuration

To verify your QStash configuration is working:

1. Set all environment variables
2. Run the API server
3. Send a test request to the `/analyze` endpoint
4. Check logs to ensure the task is published to QStash
5. Verify that the callback is received on the internal processing endpoint 