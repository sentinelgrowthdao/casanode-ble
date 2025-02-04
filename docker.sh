#!/bin/bash

# Check if docker-compose.yml exists
if [ ! -f docker-compose.yml ]; then
	echo "docker-compose.yml not found!"
	exit 1
fi

# Run the Docker container with the specified image
docker compose --file "docker-compose.yml" run --rm -it --name casanode-deb ubuntu /bin/bash