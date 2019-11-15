docker build -t olympia .

docker run -ti -v ./dynamic_config:/tmp/dynamic_config olympia