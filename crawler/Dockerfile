# Crawler Dockerfile
FROM ubuntu:24.04

# Install dependencies
RUN apt-get update && apt-get install -y \
    g++ \
    cmake \
    make \
    libcurl4-openssl-dev \
    libsqlite3-dev \
    libgumbo-dev \
    && rm -rf /var/lib/apt/lists/*

# Create symlink for libgumbo.so.3 (local system has version 3, container has version 2)
# This allows the binary compiled locally to run in the container
RUN ln -s /usr/lib/x86_64-linux-gnu/libgumbo.so.2 /usr/lib/x86_64-linux-gnu/libgumbo.so.3 && ldconfig

WORKDIR /app

# Copy source files (build/ excluded via .dockerignore)
COPY . .

# Create build directory and build
RUN rm -rf build && \
    mkdir -p build && \
    cd build && \
    cmake .. && \
    make

# Create data directory
RUN mkdir -p /app/data

# Set environment variable for database path
ENV DB_PATH=/app/data/crawler_data.db

# Copy the database path to shared volume
WORKDIR /app/build

CMD ["./crawler"]
