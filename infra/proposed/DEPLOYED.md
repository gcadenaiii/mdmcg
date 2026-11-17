# What is live on the server

2026-11-17 08:41 UTC. Release `20261117T083926Z` is what mdmcg.com serves (`/var/www/mdmcg/current`).

- Installed as `/etc/nginx/sites-available/rpm`: `nginx-mdmcg.INSTALLED-2026-11-17.conf` (the mdmcg.com blocks of
  `nginx-mdmcg.conf` only). The ifiin.com preview blocks were NOT installed: ifiin.com is not an enabled site on the
  server and the owner chose to go straight to mdmcg.com.
- Snippets installed: `/etc/nginx/snippets/mdmcg-static.conf`, `mdmcg-locations.conf`.
- Access code file: `/etc/nginx/mdmcg-access.htpasswd` (one user; the code is in no file of this repository).
- Old settings kept at `/etc/nginx/sites-available/rpm.before-redesign`; full dump at `~/nginx-before-redesign.txt`.
- Checked after the reload: every new page 200; `/v1/` 200 with noindex; unknown address 404; `/lab/`, `/platform/` and
  the dashboard's data 401 without the code and 200 with it; `/platform/health` 200; a heartbeat post without a device key
  is refused by the backend itself (Bearer), as before; backend and database containers still up.
- Search engines: closed (robots.txt and noindex) until the owner opens it.

Roll back to the old site and settings:

    sudo cp /etc/nginx/sites-available/rpm.before-redesign /etc/nginx/sites-available/rpm && sudo nginx -t && sudo systemctl reload nginx
