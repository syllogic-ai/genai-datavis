![Backend Build](https://github.com/syllogic-ai/genai-datavis/actions/workflows/backend-build.yml/badge.svg)

![Frontend Build](https://github.com/syllogic-ai/genai-datavis/actions/workflows/frontend-build.yml/badge.svg)

# GenAI DataVis Project

Ever wanted to talk with your visualizations just like talking with ChatGPT? With Syllogic, you can do that! Simply ask what you want, and watch our agent transforming your asks to valuable visual reports!

## Project Structure

- `apps/frontend`: Next.js frontend application
- `apps/backend`: FastAPI backend application

## Environment Variables

This project uses separate environment files for the frontend and backend applications.

### Backend Environment Variables

Backend environment variables are stored in `apps/backend/.env`:

```
# Server Configuration
PORT=8000
HOST=0.0.0.0
DEBUG=True

# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/database_name

# API Keys and Secrets 
SECRET_KEY=your_secret_key_here
JWT_SECRET=your_jwt_secret_here

# CORS Settings
FRONTEND_URL=http://localhost:3000

# Other Services
OPENAI_API_KEY=your_openai_api_key_here
```

### Frontend Environment Variables

Frontend environment variables are stored in `apps/frontend/.env.local`:

```
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000

# Authentication
NEXT_PUBLIC_AUTH_ENABLED=true

# Feature Flags
NEXT_PUBLIC_FEATURE_ANALYTICS=true

# External Services
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token_here
```

**Note**: In the frontend, only variables prefixed with `NEXT_PUBLIC_` are exposed to the browser.

## Setup Instructions

1. Clone the repository
2. Set up the environment variables:

```bash
# Set up backend environment
cd apps/backend
cp .env.example .env
# Edit .env with your values

# Set up frontend environment
cd ../frontend
cp .env.example .env.local
# Edit .env.local with your values
```

3. Install dependencies and start the applications:

```bash
# Start backend
cd apps/backend
python setup.py --run  # Sets up environment and starts the server

# Start frontend (in another terminal)
cd apps/frontend
npm install
npm run dev
```

For more detailed instructions, see the README files in the respective application directories.

## Environment Variables Best Practices

1. Never commit environment files (.env, .env.local) to version control
2. Keep sensitive data only in backend environment files
3. Use .env.example files as templates
4. Set different values for development, testing, and production environments
5. For production deployments, use the environment variable management of your hosting provider 