#!/bin/bash

# Obtener ID del contenedor en ejecución
container_id=$(docker ps -q --filter ancestor=elsermanuel/ciskoi-wallet-vg:latest)

if [ -z "$container_id" ]; then
  echo "No se encontró ningún contenedor en ejecución."
  exit 1
fi

echo "Contenedor encontrado: $container_id"
echo ""

echo "=== Contenido de /usr/share/nginx/html/ ==="
docker exec -it $container_id /bin/sh -c 'ls -la /usr/share/nginx/html/'
echo ""

echo "=== Verificando archivos HTML ==="
docker exec -it $container_id /bin/sh -c 'find /usr/share/nginx/html -name "*.html"'
echo ""

echo "=== Número de archivos HTML ==="
docker exec -it $container_id /bin/sh -c 'find /usr/share/nginx/html -name "*.html" | wc -l'
echo ""

echo "=== Contenido de index.html ==="
docker exec -it $container_id /bin/sh -c 'cat /usr/share/nginx/html/index.html | head -20'
echo ""

echo "=== Configuración de Nginx ==="
docker exec -it $container_id /bin/sh -c 'cat /etc/nginx/conf.d/default.conf'
echo ""

echo "=== Verificando rutas de Angular ==="
docker exec -it $container_id /bin/sh -c 'grep -r "routerLink" /usr/share/nginx/html/ || echo "No se encontraron rutas de Angular"'
echo ""

echo "=== Log de Nginx ==="
docker exec -it $container_id /bin/sh -c 'cat /var/log/nginx/error.log || echo "No hay log de errores"'
echo ""
docker exec -it $container_id /bin/sh -c 'cat /var/log/nginx/access.log || echo "No hay log de acceso"'
