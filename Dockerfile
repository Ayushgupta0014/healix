FROM node:20-slim

# Install Python 3 & pip for AI Surgeon Agent
RUN apt-get update && apt-get install -y python3 python3-pip python3-venv git && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Orchestrator & Target App dependencies
COPY orchestrator-api/package*.json ./orchestrator-api/
RUN cd orchestrator-api && npm install

COPY target-app/package*.json ./target-app/
RUN cd target-app && npm install

# Setup Python virtual env & dependencies
COPY ai-agents/requirements.txt ./ai-agents/
RUN python3 -m venv /app/ai-agents/venv && /app/ai-agents/venv/bin/pip install --no-cache-dir -r ./ai-agents/requirements.txt

# Copy full source code
COPY . .

# Configure git identity for automated audit commits
RUN git config --global user.email "healix-bot@sre.dev" && git config --global user.name "Healix Autonomous SRE"

EXPOSE 5000

# Launch both Python AI Agent & Node.js Orchestrator
CMD ["sh", "-c", "/app/ai-agents/venv/bin/python /app/ai-agents/agent.py & node /app/orchestrator-api/index.js"]