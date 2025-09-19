#!/bin/bash

# DueSpark Server Restart Script
# This script stops existing servers and starts fresh ones

echo "🔄 Restarting DueSpark servers..."

# Kill existing processes
echo "🛑 Stopping existing servers..."

# Kill backend processes (uvicorn/FastAPI)
pkill -f "uvicorn.*app.main:app" 2>/dev/null || echo "  No backend processes found"

# Kill frontend processes (npm run dev/Vite)
pkill -f "vite.*sic_app" 2>/dev/null || echo "  No frontend processes found"

# Kill any remaining node processes in sic_app directory
pkill -f "node.*sic_app" 2>/dev/null

# Wait a moment for processes to fully terminate
echo "⏳ Waiting for processes to terminate..."
sleep 3

# Start backend server
echo "🚀 Starting backend server..."
cd sic_backend_mvp_jwt_sqlite
export DATABASE_URL="sqlite:///./app.db"
export SECRET_KEY="development-secret-key-change-in-production"
nohup uvicorn app.main:app --reload --host 0.0.0.0 --port 8005 > ../backend.log 2>&1 &
BACKEND_PID=$!
echo "  Backend started with PID: $BACKEND_PID"
echo "  Logs: backend.log"

# Start frontend server
echo "🚀 Starting frontend server..."
cd ../sic_app
nohup npm run dev > ../frontend.log 2>&1 &
FRONTEND_PID=$!
echo "  Frontend started with PID: $FRONTEND_PID"
echo "  Logs: frontend.log"

# Wait a moment for servers to initialize
echo "⏳ Initializing servers..."
sleep 5

# Check if servers are running
echo "🔍 Checking server status..."

# Check backend
if curl -s http://localhost:8005/docs > /dev/null 2>&1; then
    echo "  ✅ Backend server is running at http://localhost:8005"
    echo "     API docs: http://localhost:8005/docs"
else
    echo "  ❌ Backend server may not be running correctly"
    echo "     Check backend.log for errors"
fi

# Check frontend
if curl -s http://localhost:5173 > /dev/null 2>&1; then
    echo "  ✅ Frontend server is running at http://localhost:5173"
else
    echo "  ❌ Frontend server may not be running correctly"
    echo "     Check frontend.log for errors"
fi

echo ""
echo "🎉 Server restart complete!"
echo ""
echo "📊 Server URLs:"
echo "   Frontend: http://localhost:5173"
echo "   Backend:  http://localhost:8005"
echo "   API Docs: http://localhost:8005/docs"
echo ""
echo "📋 Process IDs:"
echo "   Backend PID:  $BACKEND_PID"
echo "   Frontend PID: $FRONTEND_PID"
echo ""
echo "📝 Log files:"
echo "   Backend:  backend.log"
echo "   Frontend: frontend.log"
echo ""
echo "🛑 To stop servers: ./stop-servers.sh (or pkill -f uvicorn && pkill -f vite)"