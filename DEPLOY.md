# Deployment Guide for Bus Salamanca Alexa

This project is now Dockerized and ready to be deployed on your local server.

## Prerequisites

- **Docker** and **Docker Compose** installed on your server.
- **Traefik** (or another reverse proxy) configured to handle SSL and route requests to this container.
- **Alexa Developer Console** account to configure the endpoint.

## 1. Data Persistence (SQLite)

The application uses SQLite to store user preferences (stop numbers).
The Docker container expects a volume mounted at `/data`.
The database file will be created at `/data/storage.db` inside the container.

## 2. Docker Deployment

### Manual Run

```bash
docker run -d \
  --name bus-salamanca \
  -p 3000:3000 \
  -v ./data:/data \
  ghcr.io/juanmandev/bussalamancaalexa:latest
```

### Docker Compose (Recommended)

Add this service to your `docker-compose.yml`:

```yaml
services:
  bus-salamanca:
    image: ghcr.io/juanmandev/bussalamancaalexa:latest
    container_name: bus-salamanca
    restart: unless-stopped
    environment:
      - VERIFY_SIGNATURE=true
      # Optional but recommended: reject requests from any other skill id
      # - ALEXA_SKILL_ID=amzn1.ask.skill.xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
    volumes:
      - ./bus-data:/data
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.bus-salamanca.rule=Host(`bus-alexa.yourdomain.com`)"
      - "traefik.http.routers.bus-salamanca.entrypoints=websecure"
      - "traefik.http.routers.bus-salamanca.tls.certresolver=myresolver"
      - "traefik.http.services.bus-salamanca.loadbalancer.server.port=3000"
```

*Replace `bus-alexa.yourdomain.com` and `myresolver` with your actual configuration.*

## 3. Alexa Configuration

1. Go to the [Alexa Developer Console](https://developer.amazon.com/alexa/console/ask).
2. Select your Skill (`Bus Salamanca`).
3. Go to **Build** > **Endpoint**.
4. Select **HTTPS**.
5. In **Default Region**, enter your public URL (e.g., `https://bus-alexa.yourdomain.com`).
6. In **SSL Certificate Type**, select "My development endpoint has a certificate from a trusted certificate authority" (since Traefik/Let's Encrypt provides valid certs).
7. Save Endpoints.
8. Upload the manifest and the interaction model from `skill-package/` (see [ALEXA_PLUS.md](ALEXA_PLUS.md)) and make sure **CanFulfillIntentRequest** and **APL** interfaces are enabled.

The container exposes `GET /health` for Docker/Traefik health checks and `GET /openapi.yaml` describing the REST endpoints used for Alexa+ Actions.

## 4. Local Testing

You can verify the image locally before deploying:

1. Build the image:
   ```bash
   docker build -t bus-salamanca .
   ```
2. Run it with signature verification disabled (local only!):
   ```bash
   docker run -p 3000:3000 -e VERIFY_SIGNATURE=false bus-salamanca
   ```
3. Run the smoke tests:
   ```bash
   npm run test:local
   ```
   13 request types (LaunchRequest, intents with word-number slots, CanFulfillIntentRequest, …) must answer HTTP 200.
