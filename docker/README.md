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
       image: theguild/graphql-mesh:v1
       ports:
         - '4000:4000'
       environment:
         HIVE_CDN_ENDPOINT: SECRET
         HIVE_CDN_KEY: SECRET
         HIVE_REGISTRY_TOKEN: SECRET
       security_opt:
         - no-new-privileges:true
       cap_drop:
         - ALL
       cap_add:
         - CHOWN
       read_only: true
       volumes:
         - /tmp # make /tmp writable
         # Uncomment the line below to inject your custom mesh.config.ts
         # - ./path/to/local/mesh.config.ts:/app/mesh.config.ts:ro
   ```

2. **Replace placeholders:**

- Replace #### in `HIVE_CDN_ENDPOINT`, `HIVE_CDN_KEY`, and `HIVE_REGISTRY_TOKEN` with your actual
  values.

3. **Run Docker Compose:**

- In the directory containing your `docker-compose.yml` file, run the following command:

  ```sh
  docker compose up
  ```

  This command will:

  - Pull the graphql mesh gateway image if it is not already available locally.
  - Pull the supergraph from your Hive registry using the provided environment variables.
  - Start the Mesh Gateway service on port `4000`.

### Custom Docker Image

You can create a custom Docker image that inherits from the theguild/graphql-mesh:v1 base image.

```dockerfile
FROM theguild/graphql-mesh:v1

# Extend here
```

Then build your image:

```sh
docker build -t graphql-mesh-gateway .
```

### Running the Docker Container

To run the Docker container with your custom image, use the following command:

```sh
docker run --read-only --cap-drop=ALL --cap-add=CHOWN --security-opt no-new-privileges -p 4000:4000 \
  -e HIVE_CDN_ENDPOINT=your-hive-cdn-endpoint \
  -e HIVE_CDN_KEY=your-hive-cdn-key \
  -e HIVE_REGISTRY_TOKEN=your-hive-registry-token \
  graphql-mesh-gateway
```

Replace `your-hive-cdn-endpoint`, `your-hive-cdn-key` and `your-hive-registry-token` with your
actual values.

Description of the used Security Options:

- `--read-only`: This flag makes the container's filesystem read-only, enhancing security by
  preventing any modifications to the filesystem during runtime.
- `--cap-drop=ALL`: This option drops all Linux capabilities from the container, reducing the
  potential attack surface by limiting the container’s privileges.
- `--cap-add=CHOWN`: This flag adds back the CHOWN capability, allowing the container to change file
  ownership. This is necessary since it allows us to modify file ownership inside the container.
- `--security-opt no-new-privileges`: This option ensures that the container cannot gain additional
  privileges via setuid or setgid binaries, preventing potential privilege escalation attacks.
