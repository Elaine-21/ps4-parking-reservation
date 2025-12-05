# FROM node:20
# WORKDIR /app
# CMD ["echo", "Service not implemented yet"]

FROM node:20
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
CMD ["node", "src/index.js"]