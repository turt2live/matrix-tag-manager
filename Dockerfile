FROM node:10-alpine AS BUILDER
COPY . /app
RUN cd /app && npm install -g @angular/cli && npm install && ng build --prod

FROM nginx
COPY --from=BUILDER /app/dist/matrix-tag-manager /usr/share/nginx/html
