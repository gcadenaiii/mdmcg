# Putting a release on the server: step by step

Nothing in this file has been run. Every step is run by the owner, when the owner says so.
The files in this folder are proposals; `infra/nginx.conf` is unchanged and still describes the live server.
The nginx files here were written by hand and have **not** been syntax-tested: `sudo nginx -t` (steps 5 and 8) is the test.

The example release name below is `20261117T081705Z`. Use the name the assemble script printed.

## What ends up where on the server

```
/var/www/mdmcg/releases/20261117T081705Z/   one complete release (new site, v1/, lab/, platform/)
/var/www/mdmcg/current   -> releases/20261117T081705Z     what mdmcg.com serves
/var/www/mdmcg/index.html, /var/www/mdmcg/assets/         today's site, left untouched (config rollback uses it)
/var/www/ifiin/current   -> /var/www/mdmcg/releases/...   what the private preview (ifiin.com) serves
/etc/nginx/mdmcg-access.htpasswd                          the access code, hashed
/etc/nginx/snippets/mdmcg-static.conf, mdmcg-locations.conf
/etc/nginx/sites-available/rpm                            replaced by nginx-mdmcg.conf (old copy kept)
```

## 0. On this computer: make the release

```
cd "C:\Users\George Cadena\Documents\mdmcg-research\website"
node scripts\import-lab.mjs
node scripts\assemble-release.mjs --build
node scripts\serve-release.mjs
```

The first command is only needed when the research tools changed. The last one serves the release at
http://127.0.0.1:5181/ for a look before anything is uploaded (stop it with Ctrl+C).

## 1. Upload the release (nothing live changes)

On this computer:

```
cd "C:\Users\George Cadena\Documents\mdmcg-research\website"
tar -czf release\20261117T081705Z.tar.gz -C release 20261117T081705Z
scp release\20261117T081705Z.tar.gz lightsail-rpm:/tmp/
ssh lightsail-rpm
```

Then on the server:

```
sudo mkdir -p /var/www/mdmcg/releases
sudo tar -xzf /tmp/20261117T081705Z.tar.gz -C /var/www/mdmcg/releases --no-same-owner
sudo chmod -R a+rX /var/www/mdmcg/releases/20261117T081705Z
ls /var/www/mdmcg/releases/20261117T081705Z
```

The last line should show `index.html`, `v1`, `lab`, `platform`, `robots.txt`, `RELEASE.json`.

## 2. First time only: look at the server before changing it

```
sudo nginx -T > ~/nginx-before-redesign.txt
sudo cp /etc/nginx/sites-available/rpm /etc/nginx/sites-available/rpm.before-redesign
diff <(sudo cat /etc/nginx/sites-available/rpm) ~/mdmcg/infra/nginx.conf
df -h /var/www
```

If the `diff` prints differences (certbot edits this file), carry those lines into `nginx-mdmcg.conf` before step 5.
The second line is the copy that the config rollback in step 10 restores.

## 3. First time only: create the access code file

```
sudo apt install apache2-utils
sudo htpasswd -c /etc/nginx/mdmcg-access.htpasswd CHOSEN-USER-NAME
sudo chown root:www-data /etc/nginx/mdmcg-access.htpasswd
sudo chmod 640 /etc/nginx/mdmcg-access.htpasswd
```

`CHOSEN-USER-NAME` is a placeholder: pick any name (for example the word people will type in the "user" box).
The command then asks for the access code twice. Type it there; it is never part of a command, so it is not saved
in the shell history, and only its hash is stored. To add a second person later, the same command without `-c`.

## 4. First time only: install the two snippet files

On this computer:

```
cd "C:\Users\George Cadena\Documents\mdmcg-research\website\infra\proposed"
scp snippets\mdmcg-static.conf snippets\mdmcg-locations.conf nginx-mdmcg.conf lightsail-rpm:/tmp/
```

On the server:

```
sudo cp /tmp/mdmcg-static.conf /tmp/mdmcg-locations.conf /etc/nginx/snippets/
```

## 5. Preview on the spare domain first (ifiin.com). mdmcg.com is not touched in this step.

Point the preview at the release:

```
sudo ln -sfn /var/www/mdmcg/releases/20261117T081705Z /var/www/ifiin/current
```

Install **only the two ifiin.com server blocks** from `nginx-mdmcg.conf` (the last two `server { ... }` blocks):
open the live file with `sudo nano /etc/nginx/sites-available/rpm`, replace its two ifiin.com blocks with those two,
leave the mdmcg.com blocks exactly as they are, save. Then:

```
sudo nginx -t
sudo systemctl reload nginx
```

Run the reload only if `nginx -t` says "syntax is ok" and "test is successful". `reload` (never `restart`) lets
requests in progress finish.

## 6. Check the preview

Open https://ifiin.com/ in a browser. It asks for the user name and the access code.

- `/`, `/device/`, `/science/`, `/heart-twin/`, `/sensors/`, `/evidence/`, `/team/`, `/work-with-us/` load.
- `/v1/` shows the earlier site with the black pill at the bottom left; its pictures load.
- `/lab/` opens; both tabs (Heart Twin, Sensor exploration) work.
- `/platform/` shows the dashboard with real data (it talks to the same backend as the live site).
- A nonsense address shows the "Page not found" page.

From the server, without the code, the device addresses must still answer as they do today:

```
curl -s -o /dev/null -w "%{http_code}\n" https://ifiin.com/platform/health
curl -s -o /dev/null -w "%{http_code}\n" -X POST https://ifiin.com/platform/api/heartbeat
curl -s -o /dev/null -w "%{http_code}\n" https://ifiin.com/platform/api/dashboard
curl -sI https://ifiin.com/v1/ | grep -i -E "x-robots|HTTP"
```

Expected: `200`; then `401` or `403` **from the backend** (no device key was sent; the same answer as
`https://mdmcg.com/platform/api/heartbeat` gives today, compare the two); then `401` from nginx (no access code);
then a `401` line (the preview asks for the code everywhere).

## 7. Point mdmcg.com's folder at the release (still no visible change)

```
sudo ln -sfn /var/www/mdmcg/releases/20261117T081705Z /var/www/mdmcg/current
```

The live configuration does not read `current` yet.

## 8. Switch mdmcg.com to the new configuration

```
sudo cp /tmp/nginx-mdmcg.conf /etc/nginx/sites-available/rpm
sudo nginx -t
sudo systemctl reload nginx
```

Again: reload only after a clean `nginx -t`. If the test fails, the old configuration keeps running; restore the
file with the first command of step 10 and nothing has changed.

## 9. Check mdmcg.com

The same list as step 6, on https://mdmcg.com/, plus:

```
curl -s -o /dev/null -w "%{http_code}\n" https://mdmcg.com/platform/health
curl -sI https://mdmcg.com/v1/ | grep -i x-robots
curl -sI https://mdmcg.com/lab/ | head -1
cd ~/mdmcg/infra && docker compose logs backend --tail=30
```

Expected: `200`; `x-robots-tag: noindex, nofollow, noarchive`; `401`; and, if any gateway is switched on, its
uploads and heartbeats still answered with 200 in the backend log.

## 10. Rollback

**The new configuration is wrong** (back to exactly today's server, old site and old dashboard):

```
sudo cp /etc/nginx/sites-available/rpm.before-redesign /etc/nginx/sites-available/rpm && sudo nginx -t && sudo systemctl reload nginx
```

**A later release is wrong** (back to the release before it; no reload needed, nginx follows the link on the next
request). Replace the name with the previous release's folder, shown by `ls /var/www/mdmcg/releases`:

```
sudo ln -sfn /var/www/mdmcg/releases/PREVIOUS-RELEASE-NAME /var/www/mdmcg/current
```

## Later releases

Steps 0, 1, then `sudo ln -sfn ... /var/www/ifiin/current` to preview, then step 7. No nginx change, no reload,
no Docker command. Keep the last five folders in `/var/www/mdmcg/releases`; each is about 52 MB.

## Launch day (opening to search engines)

Two switches, changed together, then a new release:

1. `site/src/config.ts`: `NOINDEX` to `false`.
2. `node scripts\assemble-release.mjs --build --open` (writes a robots.txt that lets crawlers in, keeps `/lab/`
   and `/platform/` out, and leaves `/v1/` fetchable so its "noindex" is seen).

## Decisions built into these files

- **Device endpoints stay reachable without the access code** (`/platform/api/upload`, `/platform/api/heartbeat`,
  `/platform/api/gateways`, `/platform/api/patients`, `/platform/health`). They are already protected by the device
  key. The access code and the device key use the same request header, so putting the code in front of them would
  make posting impossible for every gateway, not merely harder.
- **Everything a person reads under `/platform` asks for the access code**: the dashboard pages, the JSON they read
  (`/platform/api/dashboard`, `/platform/api/gateway/...`, `/platform/api/patient/...`), the admin pages
  (`/platform/admin/...`) and the live stream (`/platform/ws/...`). Today all of these are open to anyone with the
  address. The proxy lines are unchanged; two `auth_basic` lines were added to each block and can be deleted to
  return to today's behaviour.
- **Live stream caveat**: some browsers (Safari in particular) do not send a saved access code when opening a
  websocket. If the live view fails only there, delete the two `auth_basic` lines in the `/platform/ws/` block.
- `/lab/` is behind the same code for now; two lines to delete when the owner opens it.
- The old `/assets/` folder is still served until 2027-01-31 for browsers that hold the old home page.
- Not included: brotli, a `www` redirect, a content-security policy. Each is a separate later change.
- Small known gap: `/v1/`, `/lab/` and `/platform/` pages have no icon of their own, so browsers ask for
  `/favicon.ico` and get one harmless 404 in the console (the old site did the same).
