FROM node:14

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# Ensuring both package.json AND package-lock.json are copied
COPY package*.json ./
RUN npm install

# If npm install fails, the Docker build should fail too
# This ensures we catch any issues with dependencies early

# Copy the rest of your application code
COPY . .

# Use the node user for better security
USER node

EXPOSE 3000 4346

CMD [ "node", "app.js" ]
