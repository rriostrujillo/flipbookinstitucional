FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install --production

COPY . .

RUN mkdir -p uploads thumbnails

EXPOSE 3001

CMD ["npm", "start"]
