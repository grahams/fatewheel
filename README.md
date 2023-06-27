# fatewheel
The IB Fate Wheel brought to Slack

# Getting started

1. Create an empty database using `sqlite3 db/fates.sqlite < db/fates.schema`
1. Create `.env` file based on `.env.example`, filling in the secrets for your slackbot
1. Build the docker container with `docker build -t grahams/fatewheel:latest .`
1. Run the container `docker-compose up`
