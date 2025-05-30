#!/bin/bash

# Crear archivo nginx.conf si no existe
if [ ! -f nginx.conf ]; then
  cat > nginx.conf << 'EOL'
server {
    listen       80;
    server_name  localhost;

    # Root directory and index files
    root   /usr/share/nginx/html;
    index  index.html index.htm;

    # Redirect server error pages to the static page /50x.html
    error_page   500 502 503 504  /50x.html;
    location = /50x.html {
        root   /usr/share/nginx/html;
    }

    # Angular routing support - redirect all requests to index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache control for static assets
    location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
        expires 1d;
        add_header Cache-Control "public, max-age=86400";
    }
}
EOL
  echo "Archivo nginx.conf creado."
fi

# Limpiar y reconstruir la imagen
docker stop $(docker ps -q --filter ancestor=elsermanuel/ciskoi-wallet-vg:latest) 2>/dev/null || true
docker rm $(docker ps -a -q --filter ancestor=elsermanuel/ciskoi-wallet-vg:latest) 2>/dev/null || true
docker rmi elsermanuel/ciskoi-wallet-vg:latest 2>/dev/null || true

# Construir imagen Docker
echo "Construyendo imagen Docker..."
docker build -t elsermanuel/ciskoi-wallet-vg:latest .

# Si la construcción fue exitosa, ejecutar el contenedor
if [ $? -eq 0 ]; then
  echo "Iniciando contenedor..."
  docker run -p 4200:80 -d elsermanuel/ciskoi-wallet-vg:latest

  # Mostrar logs del contenedor
  container_id=$(docker ps -q --filter ancestor=elsermanuel/ciskoi-wallet-vg:latest)
  if [ -n "$container_id" ]; then
    echo "Contenedor iniciado con ID: $container_id"
    echo "Logs del contenedor:"
    docker logs $container_id

    echo ""
    echo "Verificando contenido del contenedor:"
    docker exec -it $container_id /bin/sh -c 'ls -la /usr/share/nginx/html/'
    echo ""
    echo "Archivos HTML encontrados:"
    docker exec -it $container_id /bin/sh -c 'find /usr/share/nginx/html -name "*.html" | wc -l'

    echo ""
    echo "La aplicación debería estar disponible en: http://localhost:4200"
  else
    echo "No se pudo iniciar el contenedor."
  fi
else
  echo "La construcción de la imagen falló."
fi

# Instrucciones para subir a Docker Hub
echo ""
echo "Para subir la imagen a Docker Hub:"
echo "docker login"
echo "docker push elsermanuel/ciskoi-wallet-vg:latest"
