FROM node:18-alpine

WORKDIR /app

# Set Node options to increase memory limit
ENV NODE_OPTIONS="--max-old-space-size=2048"

COPY package*.json ./

RUN npm install --legacy-peer-deps

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
