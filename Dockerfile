FROM node:14

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# Ensuring both package.json AND package-lock.json are copied
COPY package*.json ./
RUN npm install

# Explicitly install express, useful for debugging or ensuring express is installed
RUN npm install express
# If npm install fails, the Docker build should fail too
# This ensures we catch any issues with dependencies early

# Copy the rest of your application code
COPY . .

# Use the node user for better security
USER node

EXPOSE 3000 4346
RUN chmod +x /usr/src/app/run.sh
CMD [ "/usr/src/app/run.sh" ]
CMD [ "node", "app.js" ]

