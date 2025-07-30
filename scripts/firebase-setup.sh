#!/bin/bash
# Firebase Setup and Management Script for Onde Spectrale

set -e

echo "🔥 Firebase Setup for Onde Spectrale..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if Firebase CLI is installed
check_firebase_cli() {
    if ! command -v firebase &> /dev/null; then
        echo -e "${RED}❌ Firebase CLI not installed${NC}"
        echo "Please install Firebase CLI first:"
        echo "npm install -g firebase-tools"
        exit 1
    fi
    echo -e "${GREEN}✅ Firebase CLI found: $(firebase --version)${NC}"
}

# Check authentication status
check_auth() {
    echo -e "${BLUE}🔍 Checking Firebase authentication...${NC}"
    if ! firebase projects:list &> /dev/null; then
        echo -e "${YELLOW}⚠️  Not authenticated with Firebase${NC}"
        echo "Please run: firebase login"
        read -p "Do you want to login now? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            firebase login
        else
            echo "Please authenticate manually and run this script again"
            exit 1
        fi
    else
        echo -e "${GREEN}✅ Firebase authentication verified${NC}"
    fi
}

# Set active project
set_project() {
    echo -e "${BLUE}📋 Setting Firebase project...${NC}"
    
    # Check if .firebaserc exists
    if [ -f ".firebaserc" ]; then
        echo -e "${GREEN}✅ Found .firebaserc configuration${NC}"
        current_project=$(firebase use 2>/dev/null | grep -o 'onde-spectrale' || echo "none")
        if [ "$current_project" != "none" ]; then
            echo -e "${GREEN}✅ Active project: $current_project${NC}"
        else
            echo -e "${YELLOW}⚠️  Setting project to onde-spectrale${NC}"
            firebase use onde
        fi
    else
        echo -e "${YELLOW}⚠️  No .firebaserc found. Please run 'firebase init' first${NC}"
        exit 1
    fi
}

# Test emulators
test_emulators() {
    echo -e "${BLUE}🧪 Testing Firebase emulators...${NC}"
    
    # Check if emulator ports are available
    local ports=(4000 8080 9099 9199)
    for port in "${ports[@]}"; do
        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
            echo -e "${YELLOW}⚠️  Port $port is already in use${NC}"
        else
            echo -e "${GREEN}✅ Port $port available${NC}"
        fi
    done
}

# Deploy functions
deploy_rules() {
    echo -e "${BLUE}🚀 Deploying Firestore rules and indexes...${NC}"
    
    if [ -f "firestore.rules" ]; then
        echo -e "${GREEN}✅ Deploying Firestore rules...${NC}"
        firebase deploy --only firestore:rules
    else
        echo -e "${YELLOW}⚠️  No firestore.rules file found${NC}"
    fi
    
    if [ -f "firestore.indexes.json" ]; then
        echo -e "${GREEN}✅ Deploying Firestore indexes...${NC}"
        firebase deploy --only firestore:indexes
    else
        echo -e "${YELLOW}⚠️  No firestore.indexes.json file found${NC}"
    fi
    
    if [ -f "storage.rules" ]; then
        echo -e "${GREEN}✅ Deploying Storage rules...${NC}"
        firebase deploy --only storage
    else
        echo -e "${YELLOW}⚠️  No storage.rules file found${NC}"
    fi
}

# Start emulators
start_emulators() {
    echo -e "${BLUE}🔧 Starting Firebase emulators...${NC}"
    
    # Kill any existing Firebase processes
    pkill -f firebase 2>/dev/null || true
    
    # Start emulators in background
    echo -e "${GREEN}🚀 Starting emulator suite...${NC}"
    firebase emulators:start --only firestore,auth,storage &
    
    echo -e "${GREEN}✅ Emulators starting...${NC}"
    echo -e "${BLUE}📱 Access Firebase UI at: http://localhost:4000${NC}"
    echo -e "${BLUE}🗄️  Firestore: http://localhost:8080${NC}"
    echo -e "${BLUE}🔐 Auth: http://localhost:9099${NC}"
    echo -e "${BLUE}📁 Storage: http://localhost:9199${NC}"
    
    # Wait for emulators to start
    sleep 5
    
    # Test connectivity
    echo -e "${BLUE}🧪 Testing emulator connectivity...${NC}"
    if curl -s http://localhost:4000 > /dev/null; then
        echo -e "${GREEN}✅ Firebase UI accessible${NC}"
    else
        echo -e "${RED}❌ Firebase UI not accessible${NC}"
    fi
}

# Stop emulators
stop_emulators() {
    echo -e "${BLUE}🛑 Stopping Firebase emulators...${NC}"
    pkill -f firebase 2>/dev/null || true
    echo -e "${GREEN}✅ Emulators stopped${NC}"
}

# Backup Firestore data
backup_data() {
    echo -e "${BLUE}💾 Creating Firestore backup...${NC}"
    
    local backup_dir="./backups/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$backup_dir"
    
    echo -e "${GREEN}📦 Backing up to: $backup_dir${NC}"
    
    # Export collections (requires authenticated project)
    firebase firestore:export "$backup_dir" || {
        echo -e "${YELLOW}⚠️  Export failed. Make sure you're authenticated and project is set${NC}"
        return 1
    }
    
    echo -e "${GREEN}✅ Backup completed: $backup_dir${NC}"
}

# Show project status
show_status() {
    echo -e "${BLUE}📊 Firebase Project Status${NC}"
    echo "=================================="
    
    # Current project
    echo -e "${GREEN}Current project:${NC}"
    firebase use 2>/dev/null || echo "No project set"
    
    # Available projects
    echo -e "${GREEN}Available projects:${NC}"
    firebase projects:list 2>/dev/null || echo "Not authenticated"
    
    # Configuration files
    echo -e "${GREEN}Configuration files:${NC}"
    [ -f ".firebaserc" ] && echo "✅ .firebaserc" || echo "❌ .firebaserc"
    [ -f "firebase.json" ] && echo "✅ firebase.json" || echo "❌ firebase.json"
    [ -f "firestore.rules" ] && echo "✅ firestore.rules" || echo "❌ firestore.rules"
    [ -f "firestore.indexes.json" ] && echo "✅ firestore.indexes.json" || echo "❌ firestore.indexes.json"
    [ -f "storage.rules" ] && echo "✅ storage.rules" || echo "❌ storage.rules"
    
    echo "=================================="
}

# Main menu
show_menu() {
    echo -e "${BLUE}🔥 Firebase Management Menu${NC}"
    echo "1. Check status"
    echo "2. Login/authenticate"
    echo "3. Set project"
    echo "4. Start emulators"
    echo "5. Stop emulators"
    echo "6. Deploy rules"
    echo "7. Backup data"
    echo "8. Test emulators"
    echo "9. Exit"
    echo -n "Choose option [1-9]: "
}

# Parse command line arguments
case "$1" in
    "status")
        check_firebase_cli
        show_status
        ;;
    "login")
        check_firebase_cli
        firebase login
        ;;
    "setup")
        check_firebase_cli
        check_auth
        set_project
        test_emulators
        echo -e "${GREEN}✅ Firebase setup completed!${NC}"
        ;;
    "emulators")
        check_firebase_cli
        check_auth
        set_project
        start_emulators
        ;;
    "stop")
        stop_emulators
        ;;
    "deploy")
        check_firebase_cli
        check_auth
        set_project
        deploy_rules
        ;;
    "backup")
        check_firebase_cli
        check_auth
        set_project
        backup_data
        ;;
    *)
        # Interactive mode
        check_firebase_cli
        
        while true; do
            show_menu
            read -r choice
            case $choice in
                1) show_status ;;
                2) firebase login ;;
                3) set_project ;;
                4) check_auth && set_project && start_emulators ;;
                5) stop_emulators ;;
                6) check_auth && set_project && deploy_rules ;;
                7) check_auth && set_project && backup_data ;;
                8) test_emulators ;;
                9) echo -e "${GREEN}👋 Goodbye!${NC}"; exit 0 ;;
                *) echo -e "${RED}Invalid option${NC}" ;;
            esac
            echo
        done
        ;;
esac