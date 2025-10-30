# Multi-stage build for better performance and smaller image

# Build stage
FROM node:22-alpine AS builder

# Install build dependencies for TaskWarrior
RUN apk add --no-cache \
    bash \
    git \
    build-base \
    cmake \
    gnutls-dev \
    libuuid \
    util-linux-dev \
    readline-dev \
    ncurses-dev \
    pkgconfig \
    rust \
    cargo \
    wget

# Install TaskWarrior 3 in builder stage
RUN mkdir -p /tmp/taskwarrior \
    && wget -qO- https://github.com/GothenburgBitFactory/taskwarrior/releases/download/v3.4.1/task-3.4.1.tar.gz | tar xz -C /tmp/taskwarrior --strip-components=1 \
    && cd /tmp/taskwarrior \
    && cmake -S . -B build -DCMAKE_BUILD_TYPE=Release \
    && cmake --build build \
    && cmake --install build \
    && cd / \
    && rm -rf /tmp/taskwarrior

# Set working directory
WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install ALL dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Set build environment variables to optimize for Docker
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Build the application with increased memory and timeout
RUN npm run build

# Production stage
FROM node:22-alpine AS runner

# # Install runtime dependencies
RUN apk add --no-cache \
    bash \
    dcron \
    gnutls \
    libuuid \
    util-linux \
    readline \
    ncurses

# # Copy TaskWarrior binary from builder
COPY --from=builder /usr/local/bin/task /usr/local/bin/task

# # Verify TaskWarrior installation
RUN task --version || echo "TaskWarrior installation check failed"

# # Set working directory
WORKDIR /app

# # Create non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001 -G nodejs

# # Copy package files and install production dependencies only
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# # Copy built application from builder stage
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# # Create taskwarrior data directory
RUN mkdir -p /home/nextjs/.task && chown nextjs:nodejs /home/nextjs/.task

# # Create default .taskrc with data.location set
RUN echo "data.location=/home/nextjs/.task" > /home/nextjs/.taskrc \
    && echo "recurrence=off" >> /home/nextjs/.taskrc \
    && chown nextjs:nodejs /home/nextjs/.taskrc

RUN echo "* * * * * /usr/local/bin/task sync" > /tmp/crontab \
    && crontab -u nextjs /tmp/crontab \
    && rm /tmp/crontab \
    && chmod 644 /etc/crontabs/nextjs

# # Switch to non-root user
USER nextjs

# # Expose port
EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

USER root
# Ensure cron log file exists and is writable
RUN touch /var/log/cron.log && chmod 666 /var/log/cron.log

RUN echo '#!/bin/bash' > /start.sh \
    && echo 'echo "Starting cron daemon..."' >> /start.sh \
    && echo 'crond -L /var/log/cron.log' >> /start.sh \
    && echo 'echo "Starting Next.js app..."' >> /start.sh \
    && echo 'su -s /bin/bash nextjs -c "cd /app && exec node server.js"' >> /start.sh \
    && chmod +x /start.sh

CMD ["/start.sh"]