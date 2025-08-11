FROM directus/directus:latest

# Set the working directory
WORKDIR /directus

RUN pnpm install 
COPY ./database /directus/database
COPY ./extensions /directus/extensions
COPY ./uploads /directus/uploads
COPY ./.directus /directus

# Copy package files and install dependencies

# Copy the rest of your project files
COPY ./.env /directus/
COPY ./package.json /directus/

COPY ./node_modules /directus/node_modules
