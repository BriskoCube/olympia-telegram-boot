docker build -t olympia .

docker run -v ./dynamic_config:/tmp/dynamic_config olympia