# Multi-stage Dockerfile for E2E Testing
FROM node:18-slim as base

# Install system dependencies for Playwright
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libatspi2.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libxss1 \
    libxtst6 \
    xdg-utils \
    curl \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY sic_app/package*.json ./sic_app/
COPY sic_backend_mvp_jwt_sqlite/requirements.txt ./sic_backend_mvp_jwt_sqlite/

# Install Node.js dependencies
WORKDIR /app/sic_app
RUN npm ci

# Install Playwright browsers
RUN npx playwright install --with-deps chromium

# Install Python dependencies
WORKDIR /app
RUN pip3 install -r sic_backend_mvp_jwt_sqlite/requirements.txt

# Copy source code
COPY sic_app/ ./sic_app/
COPY sic_backend_mvp_jwt_sqlite/ ./sic_backend_mvp_jwt_sqlite/

# Build frontend
WORKDIR /app/sic_app
RUN npm run build

# Create test environment script
WORKDIR /app
RUN echo '#!/bin/bash\n\
set -e\n\
\n\
# Start backend\n\
cd /app/sic_backend_mvp_jwt_sqlite\n\
export DATABASE_URL="sqlite:///./test_e2e.db"\n\
export SECRET_KEY="test-secret-key-for-docker-e2e"\n\
export ENCRYPTION_KEY="test-encryption-key-for-docker-e2e"\n\
export EMAIL_PROVIDER="console"\n\
python -m uvicorn app.main:app --host 0.0.0.0 --port 8005 &\n\
BACKEND_PID=$!\n\
\n\
# Start frontend\n\
cd /app/sic_app\n\
export VITE_API_BASE_URL="http://localhost:8005"\n\
npm run preview -- --port 5173 --host &\n\
FRONTEND_PID=$!\n\
\n\
# Wait for services\n\
timeout 60 bash -c "while ! curl -f http://localhost:8005/healthz; do sleep 2; done"\n\
timeout 60 bash -c "while ! curl -f http://localhost:5173; do sleep 2; done"\n\
\n\
# Run tests\n\
cd /app/sic_app\n\
export PLAYWRIGHT_BASE_URL="http://localhost:5173"\n\
export API_BASE_URL="http://localhost:8005"\n\
npx playwright test --project=chromium --reporter=github\n\
\n\
# Cleanup\n\
kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true\n' > /app/run-tests.sh

RUN chmod +x /app/run-tests.sh

# Expose ports
EXPOSE 8005 5173

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:5173 && curl -f http://localhost:8005/healthz || exit 1

# Default command
CMD ["/app/run-tests.sh"]

# Development stage with additional tools
FROM base as development

# Install additional development tools
RUN npm install -g @playwright/test lighthouse

# Install VS Code Server for remote development
RUN wget -qO- https://aka.ms/install-vscode-server/setup.sh | sh

# Create non-root user
RUN groupadd -r playwright && useradd -r -g playwright -G audio,video playwright \
    && mkdir -p /home/playwright/Downloads \
    && chown -R playwright:playwright /home/playwright \
    && chown -R playwright:playwright /app

USER playwright

# Production stage
FROM base as production

# Remove development dependencies and clean up
RUN npm prune --production && \
    rm -rf /root/.npm /tmp/* /var/tmp/* && \
    apt-get autoremove -y && \
    apt-get clean

# Create non-root user for security
RUN groupadd -r playwright && useradd -r -g playwright -G audio,video playwright \
    && mkdir -p /home/playwright/Downloads \
    && chown -R playwright:playwright /home/playwright \
    && chown -R playwright:playwright /app

USER playwright

# Set environment variables
ENV PLAYWRIGHT_BROWSERS_PATH=/home/playwright/.cache/ms-playwright
ENV NODE_ENV=test
ENV CI=true

# Metadata
LABEL org.opencontainers.image.title="DueSpark E2E Tests"
LABEL org.opencontainers.image.description="End-to-end testing environment for DueSpark"
LABEL org.opencontainers.image.source="https://github.com/yourusername/duespark"
LABEL org.opencontainers.image.vendor="DueSpark"
LABEL org.opencontainers.image.version="1.0.0"