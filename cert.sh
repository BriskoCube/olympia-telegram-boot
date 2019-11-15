mkdir cert

openssl genrsa -out cert/key.pem 2048

openssl req -new -sha256 -key cert/key.pem -out cert/crt.pem