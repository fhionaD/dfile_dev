# Use the official ASP.NET Core runtime image
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 80
EXPOSE 443

# Use the SDK image for building
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["DFile.backend/dfile.backend.csproj", "DFile.backend/"]
RUN dotnet restore "DFile.backend/dfile.backend.csproj"
COPY . .
WORKDIR "/src/DFile.backend"
RUN dotnet build "dfile.backend.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "dfile.backend.csproj" -c Release -o /app/publish

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "dfile.backend.dll"]
