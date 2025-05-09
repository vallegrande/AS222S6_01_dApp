# Etapa de build con Node.js
FROM node:20-alpine AS build

# Establecer directorio de trabajo
WORKDIR /app

# Copiar solo archivos esenciales
COPY package.json package-lock.json ./

# Instalar solo dependencias necesarias para el build
RUN npm ci --no-audit --omit=dev

# Copiar el resto del código fuente
COPY . .

# Ajustar angular.json para reducir tamaño de salida
RUN sed -i 's/"outputPath": "dist\/[^"]*"/"outputPath": "dist\/output"/g' angular.json

# Build Angular (producción, optimizado y sin mapas de fuente)
RUN npm run build -- --configuration production --output-path=dist/output --source-map=false

# Etapa final: imagen mínima usando BusyBox
FROM busybox:1.36.0-uclibc

# Crear directorio para servir archivos
WORKDIR /var/www

# Copiar los archivos generados desde el build
COPY --from=build /app/dist/output /var/www

# Exponer el puerto 80
EXPOSE 80

# Iniciar servidor HTTP liviano
CMD ["httpd", "-f", "-p", "80", "-h", "/var/www"]
