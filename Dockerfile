FROM golang:1.12-stretch

# Copy project into docker instance
COPY . /app
WORKDIR /app

# Get the go app
RUN go get -u github.com/banool/trapwords

# Build backend
RUN go build cmd/trapwords/main.go

# Expose 9092 port
EXPOSE 9092

# Set entrypoint command
CMD ./main 9092

