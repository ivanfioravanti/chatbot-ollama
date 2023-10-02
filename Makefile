include .env

.PHONY: all

build:
	docker build -t chatbot-ollama .

run:
	export $(cat .env | xargs)
	docker stop chatbot-ollama || true && docker rm chatbot-ollama || true
	docker run --name chatbot-ollama --rm -p 3000:3000 chatbot-ollama

logs:
	docker logs -f chatbot-ollama

push:
	docker tag chatbot-ollama:latest ${DOCKER_USER}/chatbot-ollama:${DOCKER_TAG}
	docker push ${DOCKER_USER}/chatbot-ollama:${DOCKER_TAG}