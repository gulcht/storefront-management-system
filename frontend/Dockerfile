# Use official Node.js image
FROM node:22-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# Set work directory
WORKDIR /app

# Copy dependency definition files
COPY package.json pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm install

# Copy application source code
COPY . .

# Expose port
EXPOSE 5173

# Run development server with host parameter to expose to the container network
CMD ["pnpm", "run", "dev", "--host"]
