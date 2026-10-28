FROM node:24-alpine@sha256:ebfe2f90462722a7a4de65e91990e97fe0d401c70e0e762c5b53302f905ec1c1 AS build
COPY site /srv
RUN cp /srv/assets/fonts/ibm-plex-sans-condensed-500.woff2 /srv/assets/fonts/ibm-plex-sans-condensed-600.woff2 /srv/login/
COPY tools/build-site.sh tools/build-site.js tools/clean-lib.js tools/audit-built.js /tools/
RUN sh /tools/build-site.sh /srv && node --expose-internals /tools/audit-built.js /srv && test ! -e /srv/debug.js

FROM caddy:2.11.4-alpine@sha256:5f5c8640aae01df9654968d946d8f1a56c497f1dd5c5cda4cf95ab7c14d58648
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /srv /srv
