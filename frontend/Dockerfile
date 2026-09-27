FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine

# Default for local `docker compose up` (resolved via the Docker network's
# service-name DNS). Override with a real URL when deploying the frontend as
# its own Render service — see README.md.
ENV LOCATION_SERVER_URL=http://location-server:3000

COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist/ect-location-ui/browser /usr/share/nginx/html
EXPOSE 80

HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/health || exit 1
