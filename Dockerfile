# Multi-stage Docker build for Interviews.tv platform
# Optimized for production deployment with security and performance

# Stage 1: PHP Dependencies
FROM composer:2.6 AS composer
WORKDIR /app
COPY api/composer.json api/composer.lock ./
RUN composer install --no-dev --optimize-autoloader --no-scripts --no-interaction

# Stage 2: Node.js Dependencies and Build
FROM node:18-alpine AS frontend-builder
WORKDIR /app

# Copy package files
COPY web/package*.json ./
RUN npm ci --only=production

# Copy source code and build
COPY web/ ./
RUN npm run build

# Stage 3: PHP Runtime Base
FROM php:8.2-fpm-alpine AS php-base

# Install system dependencies
RUN apk add --no-cache \
    nginx \
    supervisor \
    mysql-client \
    redis \
    ffmpeg \
    imagemagick \
    curl \
    zip \
    unzip \
    git \
    && docker-php-ext-install \
    pdo_mysql \
    mysqli \
    opcache \
    bcmath \
    && pecl install redis \
    && docker-php-ext-enable redis

# Install additional PHP extensions
RUN apk add --no-cache --virtual .build-deps \
    $PHPIZE_DEPS \
    imagemagick-dev \
    && pecl install imagick \
    && docker-php-ext-enable imagick \
    && apk del .build-deps

# Stage 4: Production Image
FROM php-base AS production

# Set working directory
WORKDIR /var/www/html

# Create application user
RUN addgroup -g 1000 -S www && \
    adduser -u 1000 -S www -G www

# Copy PHP configuration
COPY docker/php/php.ini /usr/local/etc/php/php.ini
COPY docker/php/php-fpm.conf /usr/local/etc/php-fpm.d/www.conf
COPY docker/php/opcache.ini /usr/local/etc/php/conf.d/opcache.ini

# Copy Nginx configuration
COPY docker/nginx/nginx.conf /etc/nginx/nginx.conf
COPY docker/nginx/default.conf /etc/nginx/http.d/default.conf

# Copy Supervisor configuration
COPY docker/supervisor/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Copy application code
COPY api/ ./api/
COPY --from=composer /app/vendor ./api/vendor
COPY --from=frontend-builder /app/dist ./web/dist

# Copy environment and configuration files
COPY .env.production .env
COPY docker/scripts/ ./scripts/

# Set permissions
RUN chown -R www:www /var/www/html && \
    chmod -R 755 /var/www/html && \
    chmod -R 777 /var/www/html/api/storage && \
    chmod +x ./scripts/*.sh

# Create necessary directories
RUN mkdir -p \
    /var/log/nginx \
    /var/log/php-fpm \
    /var/log/supervisor \
    /run/nginx \
    /var/www/html/api/storage/logs \
    /var/www/html/api/storage/cache \
    /var/www/html/api/storage/uploads

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/health || exit 1

# Expose ports
EXPOSE 80 443

# Switch to non-root user
USER www

# Start supervisor
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]

# Development stage
FROM php-base AS development

# Install development dependencies
RUN apk add --no-cache \
    nodejs \
    npm \
    bash \
    vim

# Install Xdebug for development
RUN pecl install xdebug && docker-php-ext-enable xdebug

# Copy Xdebug configuration
COPY docker/php/xdebug.ini /usr/local/etc/php/conf.d/xdebug.ini

# Set working directory
WORKDIR /var/www/html

# Copy development configuration
COPY docker/php/php-dev.ini /usr/local/etc/php/php.ini

# Create application user
RUN addgroup -g 1000 -S www && \
    adduser -u 1000 -S www -G www

# Set permissions for development
RUN chown -R www:www /var/www/html

# Switch to application user
USER www

# Default command for development
CMD ["php-fpm"]

# Testing stage
FROM development AS testing

# Switch back to root for package installation
USER root

# Install testing dependencies
RUN apk add --no-cache \
    chromium \
    chromium-chromedriver

# Install PHP testing tools
RUN composer global require phpunit/phpunit squizlabs/php_codesniffer

# Copy test configuration
COPY docker/testing/ ./testing/

# Set environment for testing
ENV APP_ENV=testing
ENV DB_DATABASE=interviews_tv_test

# Switch back to application user
USER www

# Run tests by default
CMD ["./scripts/run-tests.sh"]
