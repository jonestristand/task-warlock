# Multi-stage build for better performance and smaller image

# Build stage
FROM node:22-alpine AS builder

ARG TASKWARRIOR_VERSION=3.4.2

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
    && wget -qO- https://github.com/GothenburgBitFactory/taskwarrior/releases/download/v${TASKWARRIOR_VERSION}/task-${TASKWARRIOR_VERSION}.tar.gz | tar xz -C /tmp/taskwarrior --strip-components=1 \
    && cd /tmp/taskwarrior \
    && cmake -S . -B build -DCMAKE_BUILD_TYPE=Release \
    && cmake --build build \
    && cmake --install build \
    && strip /usr/local/bin/task \
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
    tini \
    tzdata \
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

# # Copy built application from builder stage
# The standalone output bundles the dependencies the server needs, so no npm install here
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# # Create taskwarrior data directory
RUN mkdir -p /home/nextjs/.task && chown nextjs:nodejs /home/nextjs/.task

# # Create default .taskrc with data.location set
RUN echo "data.location=/home/nextjs/.task" > /home/nextjs/.taskrc \
    && echo "recurrence=off" >> /home/nextjs/.taskrc \
    && chown nextjs:nodejs /home/nextjs/.taskrc

# # Switch to non-root user
USER nextjs

# # Expose port
EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Cron schedule for periodic `task sync` (installed by the entrypoint); "off" disables it
ENV TASK_SYNC_SCHEDULE="* * * * *"

USER root
# Ensure cron log file exists and is writable
RUN touch /var/log/cron.log && chmod 666 /var/log/cron.log

# Entrypoint runs as root: fixes volume ownership, starts cron, then runs the app as nextjs
COPY --chmod=755 docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD wget -qO /dev/null http://127.0.0.1:3000/api/health || exit 1

# tini as PID 1: forwards signals and reaps orphaned zombie processes
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["docker-entrypoint.sh"]
