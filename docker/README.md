## Running with Docker

To simplify running GraphQL Mesh, you can use the Docker image and the docker compose template we
provide. This setup allows you to easily configure and run the gateway with your own environment
variables without the need to install node and the required mesh npm packages.

### Prerequisites

Ensure you have Docker and Docker Compose installed on your machine. If not, you can download and
install them from the official Docker website.

### Docker Compose Setup

1. **Create a `docker-compose.yml` file with the following:**

   ```yaml
   version: '3.8'

   services:
     graphql-mesh:
       image: theguild/graphql-mesh-v1
       ports:
         - '4000:4000'
       environment:
         HIVE_CDN_ENDPOINT: ####
         HIVE_CDN_KEY: ####
         HIVE_REGISTRY_TOKEN: ####
   ```

2. **Replace placeholders:**

- Replace #### in `HIVE_CDN_ENDPOINT`, `HIVE_CDN_KEY`, and `HIVE_REGISTRY_TOKEN` with your actual
  values.

3. **Run Docker Compose:**

- In the directory containing your `docker-compose.yml` file, run the following command:

  ```sh
  docker-compose up
  ```

  This command will:

  - Pull the graphql mesh gateway image if it is not already available locally.
  - Pull the supergraph from your Hive registry using the provided environment variables.
  - Start the Mesh Gateway service on port `4000`.

### Custom Docker Image

If you need to build your own Docker image, you can use the following Dockerfile:

```dockerfile
FROM node:22

WORKDIR /app

COPY package.json ./
COPY mesh.config.ts ./

RUN npm i

EXPOSE 4000

ENTRYPOINT ["npx", "mesh-serve"]
```

Then build your image:

```sh
docker build -t graphql-mesh-gateway
```

### Running the Docker Container

To run the Docker container with your custom image, use the following command:

```sh
docker run -p 4000:4000 \
  -e HIVE_CDN_ENDPOINT=your-hive-cdn-endpoint \
  -e HIVE_CDN_KEY=your-hive-cdn-key \
  -e HIVE_REGISTRY_TOKEN=your-hive-registry-token \
  graphql-mesh-gateway
```

Replace `your-hive-cdn-endpoint`, `your-hive-cdn-key` and `your-hive-registry-token` with your
actual values.
