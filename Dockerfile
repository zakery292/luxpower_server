FROM node:14

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./
RUN npm install

# Bundle app source
COPY run.sh app.js index.html ./

# Create a non-root user and switch to it
RUN adduser -D myuser
USER myuser

# Expose the ports your app runs on
EXPOSE 3000 4346

# Define the command to run your app using CMD which defines your runtime
CMD [ "node", "app.js" ]
