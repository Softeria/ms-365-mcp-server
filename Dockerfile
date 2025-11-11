# Use the official Node.js 20 image as a parent image
FROM node:20-alpine AS builder

# Install build dependencies for native modules like keytar
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    libsecret-dev \
    pkgconfig

# Set the working directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install dependencies for building (ignore scripts to avoid patch-package issues)
RUN npm ci --ignore-scripts

# Rebuild only keytar (native module) without running postinstall scripts
RUN npm rebuild keytar --build-from-source

# Copy the rest of the application source code
COPY . .

# Generate the Graph API client files
RUN npm run generate

# Run the build script
RUN npm run build

# Start a new stage for the production environment
FROM node:20-alpine

# Install runtime dependencies for keytar
RUN apk add --no-cache libsecret

WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Copy the entire node_modules from builder stage (includes compiled native modules)
COPY --from=builder /usr/src/app/node_modules ./node_modules

# Copy the built application from the builder stage
COPY --from=builder /usr/src/app/dist ./dist

# Expose the port the app runs on
EXPOSE 3080

# Define the command to run the application with HTTP mode
CMD [ "node", "dist/index.js", "--http", "3080", "-v", "--org-mode" ]
