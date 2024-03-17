FROM node:14

# Create app directory
WORKDIR /usr/src/app/
# Install app dependencies
COPY package*.json ./
RUN npm install

# Explicitly install express
RUN npm install express

# Copy the rest of your application code
COPY run.sh index.html app.js ./
COPY public/ /usr/src/app/public/
# Ensure run.sh is executable
RUN chmod +x run.sh

EXPOSE 3000 4346

# Execute run.sh when the container starts
CMD [ "/usr/src/app/run.sh" ]
