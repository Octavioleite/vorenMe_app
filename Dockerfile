# Build estático (Vite) servido por nginx, que também encaminha /api e /<slug> para a API.
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Vazio = API na mesma origem (o nginx abaixo faz o proxy). Só preencha se a API tiver domínio próprio.
ARG VITE_API_URL=
ARG VITE_VOREN_URL=
RUN npm run build

FROM nginx:1.27-alpine
# O nginx oficial gera a conf a partir do template trocando ${API_URL} ao subir o container.
COPY default.conf.template /etc/nginx/templates/default.conf.template
ENV API_URL=http://api:8081
COPY --from=build /app/dist /usr/share/nginx/html
# Permissão de leitura para o nginx, venha o checkout de onde vier (exFAT, Windows...).
RUN chmod -R a+rX /usr/share/nginx/html
EXPOSE 80
