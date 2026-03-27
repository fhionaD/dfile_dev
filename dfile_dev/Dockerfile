# =============================================================================
# DFile - Multi-Stage Production Dockerfile
# =============================================================================
# Architecture: Single-host. The .NET backend serves:
#   - /api/*  → ASP.NET Core API controllers
#   - /*      → Next.js static export (wwwroot/)
#
# Build context: repo root (one level above DFile.backend / DFile.frontend)
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1 — Frontend: Build the Next.js static export
# NEXT_PUBLIC_API_URL is left EMPTY so the browser uses same-origin relative
# paths (/api/...) which the backend handles directly. Setting it to a host
# would break requests when running behind a proxy.
# -----------------------------------------------------------------------------
FROM node:20-alpine AS frontend-build
WORKDIR /frontend

# Install dependencies first (layer cache-friendly)
COPY DFile.frontend/package.json DFile.frontend/package-lock.json ./
RUN npm ci

# Copy source and build
COPY DFile.frontend/ ./
ENV NEXT_PUBLIC_API_URL=""
RUN npm run build
# Output lands in /frontend/out  (next.config.ts: output: 'export')

# -----------------------------------------------------------------------------
# Stage 2 — Backend: Restore, build, and publish the .NET 8 project
# -----------------------------------------------------------------------------
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS backend-build
WORKDIR /src

# Restore (separate layer so package downloads are cached)
COPY DFile.backend/dfile.backend.csproj DFile.backend/
RUN dotnet restore DFile.backend/dfile.backend.csproj

# Build & publish
COPY DFile.backend/ DFile.backend/
WORKDIR /src/DFile.backend
RUN dotnet publish dfile.backend.csproj -c Release -o /app/publish \
    --no-restore

# -----------------------------------------------------------------------------
# Stage 3 — Final runtime image
# -----------------------------------------------------------------------------
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app

# Install curl for the healthcheck (not in Debian slim by default)
RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

# Copy published .NET app
COPY --from=backend-build /app/publish ./

# Copy Next.js static export into wwwroot so ASP.NET Core's
# UseStaticFiles() and MapFallbackToFile("index.html") serve it correctly
COPY --from=frontend-build /frontend/out ./wwwroot

# Port 80 is used by Kestrel (set via ASPNETCORE_URLS below)
EXPOSE 80

# Kestrel listens on port 80 inside the container
ENV ASPNETCORE_URLS=http://+:80
ENV ASPNETCORE_ENVIRONMENT=Production

ENTRYPOINT ["dotnet", "dfile.backend.dll"]
