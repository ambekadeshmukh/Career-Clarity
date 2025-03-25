

# CareerClarity: AI-Powered Job Opportunity Validator

CareerClarity-AI-Powered Job Opportunity Validator

## 🔍 Overview

CareerClarity is an intelligent tool that helps job seekers identify genuine job opportunities versus "ghost jobs" posted without real hiring intent. By leveraging AI analysis of job descriptions, company posting patterns, and community feedback, CareerClarity provides authenticity scores that help you focus your time on legitimate opportunities.

![CareerClarity Dashboard Preview](docs/assets/dashboard-preview.png)

## ✨ Key Features

- **AI-Powered Job Analysis**: Uses natural language processing to identify red flags in job descriptions
- **Company Posting Pattern Detection**: Tracks historical job posting behaviors to identify suspicious patterns
- **Authenticity Scoring**: Calculates a confidence score based on multiple factors
- **User Dashboard**: Track and monitor jobs you're interested in
- **Community Insights**: Aggregated anonymous feedback from other applicants

## 🚀 Getting Started

### Prerequisites

- Node.js v16+ and npm
- Docker and Docker Compose
- AWS account (free tier) for production deployment
- OpenAI API key

### Quick Start

```bash
# Clone the repository
git clone https://github.com/yourusername/career-clarity.git
cd career-clarity

# Create and update .env file
cp .env.example .env
# Edit .env with your API keys

# Start the local development environment
./scripts/setup.sh

# Open in your browser
open http://localhost:3000
```

## 🏗️ Project Structure

- **Frontend**: React with TypeScript, Tailwind CSS
- **Backend API**: Express.js 
- **Infrastructure**: AWS Lambda, DynamoDB, S3, Cognito (via Terraform)
- **AI Components**: OpenAI GPT for analysis, vector database for pattern matching

## 📊 Architecture

CareerClarity follows a modern serverless architecture:

```
frontend (React) → API Gateway → Lambda functions → DynamoDB/S3
                                   ↓
                              AI Services
```

See [architecture.md](docs/architecture.md) for detailed diagrams and explanations.

## 🧠 AI Components

CareerClarity uses several AI components:

1. **Job Analyzer Agent**: Evaluates job descriptions for authenticity markers
2. **Pattern Detection Agent**: Identifies suspicious posting patterns
3. **Feedback Processor**: Analyzes user-submitted feedback
4. **Scoring Engine**: Combines signals to generate authenticity scores

## 🛠️ Development

### Local Development

```bash
# Start frontend development server
cd frontend
npm run dev

# Start backend development server
cd backend
npm run dev
```

### Testing

```bash
# Run frontend tests
cd frontend
npm test

# Run backend tests
cd backend
npm test
```

## 🚢 Deployment

### AWS Deployment (Free Tier)

```bash
# Configure AWS credentials
aws configure

# Deploy infrastructure
cd infrastructure
terraform init
terraform apply -var-file=environments/dev.tfvars
```

## 📚 Documentation

- [Architecture Overview](docs/architecture.md)
- [AI Components Documentation](docs/ai-components.md)
- [API Documentation](docs/api-docs.md)

## 🤝 Contributing

Contributions are welcome! Please read our [contributing guidelines](CONTRIBUTING.md) to get started.

## 📝 Phase 1 & 2 Roadmap

### Phase 1: Foundation (3 weeks)
- [x] Set up project structure and repository
- [x] Configure AWS infrastructure with Terraform
- [x] Implement basic React frontend with authentication
- [x] Create Express API with core endpoints
- [ ] Set up CI/CD pipeline

### Phase 2: AI Implementation (4 weeks)
- [ ] Develop job analyzer agent
- [ ] Build pattern detection system
- [ ] Create feedback collection pipeline
- [ ] Implement authenticity scoring algorithm
- [ ] Connect AI components to frontend

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.