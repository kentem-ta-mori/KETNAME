FROM debian:bookworm-slim

# Install necessary packages for VS Code and testing
RUN apt-get update && apt-get install -y \
    curl \
    gnupg \
    libnss3 \
    libdbus-1-3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libgtk-3-0 \
    libgbm1 \
    libasound2 \
    libxkbfile1 \
    libsecret-1-0 \
    libgconf-2-4 \
    xvfb \
    x11-apps \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose a port if your extension needs it (e.g., for webviews)
# EXPOSE 3000

# Command to run tests
CMD npm test
