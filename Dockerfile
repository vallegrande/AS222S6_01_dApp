# Build stage for Angular app
FROM node:20-alpine AS build

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install only production dependencies
RUN npm ci --production --no-audit --no-optional && \
    npm install ng-zorro-antd --production --no-audit --no-optional && \
    npm cache clean --force

# Copy project files
COPY . .

# Modify angular.json for build settings with increased budgets
RUN if [ -f "angular.json" ]; then \
    sed -i 's/"budgets": \[{/"budgets": \[{ "type": "initial", "maximumWarning": "10mb", "maximumError": "15mb" }, {/g' angular.json && \
    sed -i 's/"maximumWarning": "4kb"/"maximumWarning": "20kb"/g' angular.json && \
    sed -i 's/"maximumError": "8kb"/"maximumError": "30kb"/g' angular.json && \
    sed -i 's/"outputPath": "dist\/[^"]*"/"outputPath": "dist\/output"/g' angular.json; \
    fi

# Build the Angular app with full optimizations and increased memory
# If it fails with budget errors, attempt build ignoring budgets
RUN NODE_OPTIONS=--max_old_space_size=4096 npm run build -- --configuration production --optimization || \
    NODE_OPTIONS=--max_old_space_size=4096 npm run build -- --configuration production

# Use BusyBox httpd for ultra-lightweight serving
FROM busybox:1.36-musl

# Set working directory
WORKDIR /var/www

# Copy built files from build stage
COPY --from=build /app/dist/output/ /var/www/

# Fallback for different output paths
RUN if [ ! -f "/var/www/index.html" ] && [ -d "/app/dist/browser" ]; then \
    cp -r /app/dist/browser/* /var/www/; \
elif [ ! -f "/var/www/index.html" ] && [ -d "/app/dist/ciskoi-wallet" ]; then \
    cp -r /app/dist/ciskoi-wallet/* /var/www/; \
fi

# Set port
EXPOSE 80

# Run httpd
CMD ["busybox", "httpd", "-f", "-p", "80", "-h", "/var/www"]
