#!/bin/bash

# CarPlate Testing Agent
# Monitors todo completion and runs relevant tests automatically

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🤖 CarPlate Testing Agent Started${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Function to display help
show_help() {
    cat << EOF
Usage: ./test-agent.sh [command] [feature]

Commands:
  all                 Run all tests (backend + frontend)
  backend             Run all backend tests
  frontend            Run all frontend tests
  priority1           Test Priority 1 feature (Message Queuing)
  priority2           Test Priority 2 feature (Email Notifications)
  priority3           Test Priority 3 feature (Share/Invite)
  priority4           Test Priority 4 feature (QR Codes)
  priority5           Test Priority 5 feature (Rate Limiting)
  watch               Watch mode - continuous testing
  coverage            Generate test coverage report
  integration         Run integration tests
  help                Show this help message

Examples:
  ./test-agent.sh all
  ./test-agent.sh priority1
  ./test-agent.sh watch
  ./test-agent.sh coverage

EOF
}

# Function to check prerequisites
check_prerequisites() {
    echo -e "${YELLOW}Checking prerequisites...${NC}"

    # Check if MongoDB is running
    if ! pgrep -x "mongod" > /dev/null; then
        echo -e "${RED}⚠️  MongoDB is not running${NC}"
        echo -e "${YELLOW}Starting MongoDB...${NC}"
        brew services start mongodb-community || {
            echo -e "${RED}Failed to start MongoDB. Please start it manually.${NC}"
            exit 1
        }
        sleep 2
    fi

    # Check if dependencies are installed
    if [ ! -d "backend/node_modules" ]; then
        echo -e "${YELLOW}Installing backend dependencies...${NC}"
        cd backend && npm install && cd ..
    fi

    if [ ! -d "client/node_modules" ]; then
        echo -e "${YELLOW}Installing frontend dependencies...${NC}"
        cd client && npm install && cd ..
    fi

    # Check environment files
    if [ ! -f "backend/.env" ]; then
        echo -e "${YELLOW}⚠️  backend/.env not found. Copying from .env.example${NC}"
        cp backend/.env.example backend/.env
        echo -e "${YELLOW}Please edit backend/.env with your configuration${NC}"
    fi

    echo -e "${GREEN}✅ Prerequisites OK${NC}"
    echo ""
}

# Function to run backend tests
test_backend() {
    echo -e "${BLUE}Running Backend Tests...${NC}"
    cd backend
    npm test || {
        echo -e "${RED}❌ Backend tests failed${NC}"
        cd ..
        return 1
    }
    cd ..
    echo -e "${GREEN}✅ Backend tests passed${NC}"
    echo ""
}

# Function to run frontend tests
test_frontend() {
    echo -e "${BLUE}Running Frontend Tests...${NC}"
    cd client
    CI=true npm test -- --watchAll=false || {
        echo -e "${RED}❌ Frontend tests failed${NC}"
        cd ..
        return 1
    }
    cd ..
    echo -e "${GREEN}✅ Frontend tests passed${NC}"
    echo ""
}

# Function to test Priority 1: Message Queuing
test_priority1() {
    echo -e "${BLUE}Testing Priority 1: Message Queuing for Unclaimed Plates${NC}"
    echo -e "${YELLOW}Acceptance Criteria:${NC}"
    echo "  - Messages sent before claim are visible"
    echo "  - Unread messages clearly marked"
    echo "  - 'You have X messages waiting' shown on claim"
    echo ""

    cd backend
    echo -e "${BLUE}Running message queuing tests...${NC}"
    npm test -- --testNamePattern="unclaimed|queue|unread" || {
        echo -e "${RED}❌ Priority 1 tests failed${NC}"
        cd ..
        return 1
    }
    cd ..

    echo -e "${GREEN}✅ Priority 1: Message Queuing tests passed${NC}"
    echo ""
}

# Function to test Priority 2: Email Notifications
test_priority2() {
    echo -e "${BLUE}Testing Priority 2: Email Notification System${NC}"
    echo -e "${YELLOW}Acceptance Criteria:${NC}"
    echo "  - Users receive email within 5 minutes of message"
    echo "  - SMS for urgent messages (premium)"
    echo "  - Notification preferences work"
    echo ""

    cd backend
    echo -e "${BLUE}Running email notification tests...${NC}"
    npm test -- --testNamePattern="email|notification|sendgrid" || {
        echo -e "${RED}❌ Priority 2 tests failed${NC}"
        cd ..
        return 1
    }
    cd ..

    echo -e "${GREEN}✅ Priority 2: Email Notifications tests passed${NC}"
    echo ""
}

# Function to test Priority 3: Share/Invite
test_priority3() {
    echo -e "${BLUE}Testing Priority 3: Share/Invite Viral Mechanism${NC}"
    echo -e "${YELLOW}Acceptance Criteria:${NC}"
    echo "  - Share button works after message sent"
    echo "  - Deep links open correct claim flow"
    echo "  - Pre-filled message templates work"
    echo ""

    cd client
    echo -e "${BLUE}Running share/invite tests...${NC}"
    CI=true npm test -- --testNamePattern="share|invite" --watchAll=false || {
        echo -e "${RED}❌ Priority 3 tests failed${NC}"
        cd ..
        return 1
    }
    cd ..

    echo -e "${GREEN}✅ Priority 3: Share/Invite tests passed${NC}"
    echo ""
}

# Function to test Priority 4: QR Codes
test_priority4() {
    echo -e "${BLUE}Testing Priority 4: QR Code Stickers${NC}"
    echo -e "${YELLOW}Acceptance Criteria:${NC}"
    echo "  - QR code generates for claimed plates"
    echo "  - QR scan opens web form with plate pre-filled"
    echo "  - Downloadable sticker design works"
    echo ""

    cd client
    echo -e "${BLUE}Running QR code tests...${NC}"
    CI=true npm test -- --testNamePattern="qr|sticker" --watchAll=false || {
        echo -e "${RED}❌ Priority 4 tests failed${NC}"
        cd ..
        return 1
    }
    cd ..

    echo -e "${GREEN}✅ Priority 4: QR Code tests passed${NC}"
    echo ""
}

# Function to test Priority 5: Rate Limiting
test_priority5() {
    echo -e "${BLUE}Testing Priority 5: Server-Side Rate Limiting + Input Validation${NC}"
    echo -e "${YELLOW}Acceptance Criteria:${NC}"
    echo "  - Cannot send more than defined limits via API"
    echo "  - All endpoints reject invalid input"
    echo "  - Proper error messages returned"
    echo ""

    cd backend
    echo -e "${BLUE}Running rate limiting and validation tests...${NC}"
    npm test -- --testNamePattern="rate|limit|validation|sanitize" || {
        echo -e "${RED}❌ Priority 5 tests failed${NC}"
        cd ..
        return 1
    }
    cd ..

    echo -e "${GREEN}✅ Priority 5: Rate Limiting tests passed${NC}"
    echo ""
}

# Function to generate coverage report
test_coverage() {
    echo -e "${BLUE}Generating Test Coverage Report...${NC}"

    echo -e "${BLUE}Backend Coverage:${NC}"
    cd backend
    npm test -- --coverage --watchAll=false || true
    cd ..

    echo ""
    echo -e "${BLUE}Frontend Coverage:${NC}"
    cd client
    CI=true npm test -- --coverage --watchAll=false || true
    cd ..

    echo ""
    echo -e "${GREEN}✅ Coverage reports generated${NC}"
    echo -e "${YELLOW}Backend coverage: backend/coverage/lcov-report/index.html${NC}"
    echo -e "${YELLOW}Frontend coverage: client/coverage/lcov-report/index.html${NC}"
}

# Function to run integration tests
test_integration() {
    echo -e "${BLUE}Running Integration Tests...${NC}"
    echo -e "${YELLOW}Testing complete user flows:${NC}"
    echo "  1. Send message to unclaimed plate"
    echo "  2. Claim plate and see messages"
    echo "  3. Send message to claimed plate"
    echo "  4. Owner receives notification"
    echo ""

    cd backend
    npm test -- --testNamePattern="integration|flow|e2e" || {
        echo -e "${RED}❌ Integration tests failed${NC}"
        cd ..
        return 1
    }
    cd ..

    echo -e "${GREEN}✅ Integration tests passed${NC}"
}

# Function to watch mode
test_watch() {
    echo -e "${BLUE}Starting Watch Mode...${NC}"
    echo -e "${YELLOW}Tests will run automatically when files change${NC}"
    echo -e "${YELLOW}Press Ctrl+C to stop${NC}"
    echo ""

    # Start backend tests in watch mode
    cd backend
    npm test -- --watch
}

# Main command handler
case "${1:-all}" in
    all)
        check_prerequisites
        test_backend
        test_frontend
        echo -e "${GREEN}🎉 All tests passed!${NC}"
        ;;
    backend)
        check_prerequisites
        test_backend
        ;;
    frontend)
        check_prerequisites
        test_frontend
        ;;
    priority1)
        check_prerequisites
        test_priority1
        ;;
    priority2)
        check_prerequisites
        test_priority2
        ;;
    priority3)
        check_prerequisites
        test_priority3
        ;;
    priority4)
        check_prerequisites
        test_priority4
        ;;
    priority5)
        check_prerequisites
        test_priority5
        ;;
    coverage)
        check_prerequisites
        test_coverage
        ;;
    integration)
        check_prerequisites
        test_integration
        ;;
    watch)
        check_prerequisites
        test_watch
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        echo -e "${RED}Unknown command: $1${NC}"
        echo ""
        show_help
        exit 1
        ;;
esac
