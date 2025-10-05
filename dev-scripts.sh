#!/bin/bash

# CarPlate Development Scripts
# Usage: ./dev-scripts.sh [command]

case "$1" in
  "start"|"dev")
    echo "🚀 Starting CarPlate development environment..."
    echo "Frontend: http://localhost:3000"
    echo "Backend: http://localhost:5001"
    echo ""

    # Start backend in background
    echo "Starting backend..."
    cd backend && npm run dev &
    BACKEND_PID=$!

    # Give backend time to start
    sleep 3

    # Start frontend in background
    echo "Starting frontend..."
    cd ../client && npm start &
    FRONTEND_PID=$!

    # Function to cleanup on exit
    cleanup() {
      echo ""
      echo "🛑 Shutting down development servers..."
      kill $BACKEND_PID 2>/dev/null
      kill $FRONTEND_PID 2>/dev/null
      echo "✅ Cleanup complete"
      exit 0
    }

    # Trap Ctrl+C and cleanup
    trap cleanup INT

    echo ""
    echo "✅ Development environment started!"
    echo "Press Ctrl+C to stop both servers"
    echo ""

    # Wait for both processes
    wait $BACKEND_PID $FRONTEND_PID
    ;;

  "test")
    echo "🧪 Running all tests..."
    echo ""

    echo "Testing backend..."
    cd backend && npm test
    BACKEND_EXIT=$?

    echo ""
    echo "Testing frontend..."
    cd ../client && npm test -- --watchAll=false
    FRONTEND_EXIT=$?

    if [ $BACKEND_EXIT -eq 0 ] && [ $FRONTEND_EXIT -eq 0 ]; then
      echo "✅ All tests passed!"
      exit 0
    else
      echo "❌ Some tests failed!"
      exit 1
    fi
    ;;

  "build")
    echo "🏗️ Building CarPlate for production..."
    echo ""

    echo "Building frontend..."
    cd client && npm run build
    FRONTEND_EXIT=$?

    if [ $FRONTEND_EXIT -eq 0 ]; then
      echo "✅ Frontend build complete!"
      echo "📁 Build output: client/build/"
    else
      echo "❌ Frontend build failed!"
      exit 1
    fi
    ;;

  "install")
    echo "📦 Installing all dependencies..."
    echo ""

    echo "Installing backend dependencies..."
    cd backend && npm install

    echo "Installing frontend dependencies..."
    cd ../client && npm install

    echo "✅ All dependencies installed!"
    ;;

  "clean")
    echo "🧹 Cleaning up..."
    echo ""

    echo "Cleaning backend..."
    cd backend && rm -rf node_modules coverage

    echo "Cleaning frontend..."
    cd ../client && rm -rf node_modules build coverage

    echo "✅ Cleanup complete!"
    ;;

  "lint")
    echo "🔍 Running linting..."
    echo ""

    echo "Linting backend..."
    cd backend && npm run lint
    BACKEND_EXIT=$?

    echo ""
    echo "Linting frontend..."
    cd ../client && npm run lint || echo "Frontend linting not configured"
    FRONTEND_EXIT=$?

    if [ $BACKEND_EXIT -eq 0 ]; then
      echo "✅ Linting complete!"
    else
      echo "❌ Linting issues found!"
      exit 1
    fi
    ;;

  "backend")
    echo "🔧 Starting backend only..."
    cd backend && npm run dev
    ;;

  "frontend")
    echo "⚛️ Starting frontend only..."
    cd client && npm start
    ;;

  "help"|*)
    echo "CarPlate Development Scripts"
    echo ""
    echo "Usage: ./dev-scripts.sh [command]"
    echo ""
    echo "Commands:"
    echo "  start, dev    Start both frontend and backend"
    echo "  test          Run all tests"
    echo "  build         Build for production"
    echo "  install       Install all dependencies"
    echo "  clean         Clean all node_modules and build files"
    echo "  lint          Run linting on both projects"
    echo "  backend       Start backend only"
    echo "  frontend      Start frontend only"
    echo "  help          Show this help message"
    echo ""
    echo "Examples:"
    echo "  ./dev-scripts.sh dev      # Start development environment"
    echo "  ./dev-scripts.sh test     # Run all tests"
    echo "  ./dev-scripts.sh build    # Build for production"
    ;;
esac