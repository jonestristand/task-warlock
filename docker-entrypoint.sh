#!/bin/sh
set -e

APP_USER=nextjs
APP_GROUP=nodejs
APP_HOME=/home/nextjs

# Bind-mounted directories that don't exist on the host are created by Docker
# as root, which the app user can't write to. Fix ownership on startup.
for dir in "$APP_HOME/.task" "$APP_HOME/.taskwarlock"; do
  mkdir -p "$dir"
  if [ "$(stat -c %u "$dir")" != "$(id -u "$APP_USER")" ]; then
    echo "Fixing ownership of $dir"
    chown -R "$APP_USER:$APP_GROUP" "$dir" 2>/dev/null \
      || echo "Warning: could not chown $dir (read-only mount?)"
  fi
done

# Periodic `task sync`. Set TASK_SYNC_SCHEDULE to a cron expression,
# or to "off" (or empty) to disable it, e.g. when no sync server is configured.
if [ -n "$TASK_SYNC_SCHEDULE" ] && [ "$TASK_SYNC_SCHEDULE" != "off" ]; then
  echo "Scheduling task sync: $TASK_SYNC_SCHEDULE"
  echo "$TASK_SYNC_SCHEDULE /usr/local/bin/task sync" | crontab -u "$APP_USER" -
  crond -L /var/log/cron.log
else
  echo "Periodic task sync disabled"
fi

echo "Starting Next.js app..."
exec su -s /bin/bash nextjs -c "cd /app && exec node server.js"
