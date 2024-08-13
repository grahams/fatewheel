#!/bin/bash
app="grahams/fatewheel:latest"
docker rmi ${app}
docker buildx build --tag ${app} .
