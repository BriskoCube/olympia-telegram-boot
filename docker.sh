docker build -t olympia .

docker run -d -v /root/olympia-telegram-boot/dynamic_config:/tmp/dynamic_config olympia