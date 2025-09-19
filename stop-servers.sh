#!/bin/bash

# DueSpark Server Stop Script
# This script stops all running DueSpark servers

echo "🛑 Stopping DueSpark servers..."

# Kill backend processes (uvicorn/FastAPI)
echo "  Stopping backend server..."
pkill -f "uvicorn.*app.main:app" 2>/dev/null && echo "    ✅ Backend stopped" || echo "    ℹ️  No backend processes found"

# Kill frontend processes (npm run dev/Vite)
echo "  Stopping frontend server..."
pkill -f "vite.*sic_app" 2>/dev/null && echo "    ✅ Frontend stopped" || echo "    ℹ️  No frontend processes found"

# Kill any remaining node processes in sic_app directory
pkill -f "node.*sic_app" 2>/dev/null

# Wait a moment for processes to fully terminate
sleep 2

# Check if any processes are still running
BACKEND_RUNNING=$(pgrep -f "uvicorn.*app.main:app" | wc -l)
FRONTEND_RUNNING=$(pgrep -f "vite.*sic_app" | wc -l)

if [ $BACKEND_RUNNING -gt 0 ] || [ $FRONTEND_RUNNING -gt 0 ]; then
    echo "⚠️  Some processes may still be running:"
    if [ $BACKEND_RUNNING -gt 0 ]; then
        echo "    Backend processes: $BACKEND_RUNNING"
    fi
    if [ $FRONTEND_RUNNING -gt 0 ]; then
        echo "    Frontend processes: $FRONTEND_RUNNING"
    fi
    echo "    You may need to manually kill them with: kill -9 <PID>"
else
    echo "✅ All servers stopped successfully"
fi

echo ""
echo "🔄 To restart servers: ./restart-servers.sh"