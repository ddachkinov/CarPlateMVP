# 🚗 CarPlate MVP

A privacy-respecting app that enables anonymous messaging to vehicle owners using license plate numbers.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- PlateRecognizer API token (for OCR functionality)

### Development Setup

1. **Clone and setup environment**
   ```bash
   git clone <repository-url>
   cd CarPlateApp

   # Install all dependencies
   ./dev-scripts.sh install
   ```

2. **Configure environment variables**
   ```bash
   # Backend configuration
   cp backend/.env.example backend/.env
   # Edit backend/.env with your MongoDB URI

   # Frontend configuration
   cp client/.env.example client/.env
   # Edit client/.env with your PlateRecognizer API token
   ```

3. **Start development environment**
   ```bash
   # Start both frontend and backend
   ./dev-scripts.sh dev

   # Or start individually:
   ./dev-scripts.sh backend    # Backend only
   ./dev-scripts.sh frontend   # Frontend only
   ```

4. **Access the application**
   - Frontend: http://localhost:3000
   - Backend: http://localhost:5001

### Development Scripts

```bash
./dev-scripts.sh dev      # Start both servers
./dev-scripts.sh test     # Run all tests
./dev-scripts.sh build    # Build for production
./dev-scripts.sh lint     # Run code linting
./dev-scripts.sh clean    # Clean node_modules
./dev-scripts.sh help     # Show all commands
```

## 🧪 Testing

```bash
# Run all tests
./dev-scripts.sh test

# Backend tests only
cd backend && npm test

# Frontend tests only
cd client && npm test
```

## 🏗️ Project Structure

```
CarPlateApp/
├── client/              # React frontend
│   ├── src/
│   │   ├── api/         # API client
│   │   ├── components/  # React components
│   │   └── ...
│   └── package.json
├── backend/             # Express API
│   ├── models/          # MongoDB models
│   ├── routes/          # API routes
│   ├── tests/           # API tests
│   └── package.json
├── docs/                # Documentation (private)
├── .github/             # CI/CD workflows
└── dev-scripts.sh       # Development utilities
```

## 🔧 Core Features

- **Anonymous Messaging**: Send predefined safety messages to any license plate
- **Plate Claiming**: Car owners can claim their plates to receive messages
- **OCR Integration**: Upload photos to auto-detect license plates
- **User Tiers**: Guest (limited) vs Registered (full features)
- **Trust System**: Community-driven abuse prevention

## 🛡️ Environment Variables

### Backend (.env)
- `MONGO_URI` - MongoDB connection string
- `MONGO_DB_NAME` - Database name
- `PORT` - Server port (default: 5001)

### Frontend (.env)
- `REACT_APP_API_URL` - Backend API URL
- `REACT_APP_PLATE_RECOGNIZER_TOKEN` - OCR service token

## 📋 API Endpoints

### Plates
- `GET /api/plates` - List all plates
- `POST /api/plates/claim` - Claim plate ownership
- `GET /api/plates/owned/:userId` - Get user's plates
- `DELETE /api/plates/:plateId` - Unclaim plate

### Messages
- `POST /api/message` - Send message to plate
- `GET /api/plates/messages` - Get all messages
- `GET /api/plates/inbox/:userId` - Get user's inbox

### Users
- `POST /api/user/register` - Register user

## 🚀 Deployment

The project includes GitHub Actions for automated testing and deployment. See `.github/workflows/ci.yml` for the complete CI/CD pipeline.

## 📚 Documentation

- [Development Setup Checklist](docs/development-setup-checklist.md)
- [Pre-Release TODO List](docs/todos.md)
- [Claude Code Context](CLAUDE.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests (`./dev-scripts.sh test`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## 📄 License

This project is licensed under the ISC License.

---

**Note**: This is an MVP version focused on core functionality. See the [TODO list](docs/todos.md) for planned enhancements.