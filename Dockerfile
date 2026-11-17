FROM node:26-slim
LABEL org.opencontainers.image.source="https://github.com/grahams/fatewheel"

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are 
# copied where available (npm@5+)
COPY package*.json ./

# Remove npm after installing: the app never uses it at runtime, and the copy
# bundled with the node image drags in its own vulnerable deps (undici,
# brace-expansion, ...).
RUN npm ci --ignore-scripts \
    && npm cache clean --force \
    && rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx

# Bundle app source
COPY . .

CMD [ "node", "index.js" ]
