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

This is the live deployment on the Oracle ARM host (`/docker/bussalamancaalexa/docker-compose.yml`),
where the skill backend sits next to the Nuxt web app behind the same Traefik:

```yaml
services:
  web:
    image: ghcr.io/juanmandev/bussalamancaalexa-web:latest
    container_name: bussalamancaalexa-web
    restart: unless-stopped
    networks: [traefik-public]
    environment:
      # Last-known-good stop and line catalogues. SIRI answers with an empty catalogue outside
      # bus service hours, which would otherwise strip every stop name from the site and shrink
      # the sitemap to a handful of URLs until it recovered.
      - NUXT_DATA_DIR=/data
    volumes:
      - ./web-data:/data
    labels:
      - traefik.enable=true
      - traefik.http.routers.bussalamanca.rule=Host(`bussalamanca.79.72.51.163.nip.io`) || Host(`bussalamanca.juanman.tech`)
      - traefik.http.routers.bussalamanca.entrypoints=websecure
      - traefik.http.routers.bussalamanca.tls.certresolver=myresolver
      - traefik.http.services.bussalamanca.loadbalancer.server.port=3000

  alexa:
    image: ghcr.io/juanmandev/bussalamancaalexa:latest
    container_name: bussalamancaalexa-skill
    restart: unless-stopped
    networks: [traefik-public]
    environment:
      - VERIFY_SIGNATURE=true
      - ALEXA_SKILL_ID=amzn1.ask.skill.ec146a34-f92a-4889-893f-c245bedfd6cc
    volumes:
      - ./bus-data:/data
    labels:
      - traefik.enable=true
      - traefik.http.routers.bussalamanca-alexa.rule=Host(`bus-alexa.79.72.51.163.nip.io`) || Host(`bus-alexa.juanman.tech`)
      - traefik.http.routers.bussalamanca-alexa.entrypoints=websecure
      - traefik.http.routers.bussalamanca-alexa.tls.certresolver=myresolver
      - traefik.http.services.bussalamanca-alexa.loadbalancer.server.port=3000

networks:
  traefik-public:
    external: true
```

The `nip.io` host resolves to the server IP without any DNS record, so the endpoint can be
tested before `bus-alexa.juanman.tech` (an A record to the same IP) has propagated. Both get a
real Let's Encrypt certificate, which is what Alexa requires.

Watchtower on the host pulls new `:latest` images automatically, so a merge to `main` reaches
production a few minutes after CI publishes the ARM64 image.

## 3. Alexa Configuration

1. Go to the [Alexa Developer Console](https://developer.amazon.com/alexa/console/ask).
2. Select your Skill (`Bus Salamanca`).
3. Go to **Build** > **Endpoint**.
4. Select **HTTPS**.
5. In **Default Region**, enter `https://bus-alexa.juanman.tech/`.
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
