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

## 2026-11-17 15:55 UTC

Release `20261117T155418Z` is live (`/var/www/mdmcg/current`): home regrouped (why, design, evidence), accurate wording,
"Sensor study" and "Research tools" names, partner-access cue, per-group email buttons, the live 3D device and re-rendered
pictures. Only the `current` link changed; no nginx change, no reload. Previous release kept: `20261117T083926Z`.

Back to the previous release:

    sudo ln -sfn /var/www/mdmcg/releases/20261117T083926Z /var/www/mdmcg/current

## 2026-11-18 03:27 UTC

Release `20261118T032444Z` is live (`/var/www/mdmcg/current`), from commit `ea8f9f5` (master = redesign): one device look
matched to the opening picture, lid contacts removed, redrawn diagrams, heartbeat lines leaving the device on the first
screen, the 42 chests in cross-section, the opened device on Work with us. Only the `current` link changed; no nginx
change, no reload. Checked after the switch: every page 200, unknown address 404, `/platform/health` 200, robots.txt
still closed. Previous release kept: `20261117T160730Z`.

Back to the previous release:

    sudo ln -sfn /var/www/mdmcg/releases/20261117T160730Z /var/www/mdmcg/current

## 2026-11-18 06:11 UTC

Release `20261118T060952Z` is live (`/var/www/mdmcg/current`): product-vision voice (present tense on the product pages), new second
scene on Home ("The ECG shows half the picture", with the published comparison), new closing invitation. Only the
`current` link changed. Previous release kept: `20261118T032444Z`.

Back to the previous release:

    sudo ln -sfn /var/www/mdmcg/releases/20261118T032444Z /var/www/mdmcg/current

## 2026-11-18 07:10 UTC

Release `20261118T070847Z` is live (`/var/www/mdmcg/current`): sensor study and four-options sections removed (one device), second
scene with the bridge sentence and bars, a reading scene, evidence told once on Home, Contact in place of Work with us,
the study on Science, heartbeat lines fade on scroll, phone picture before the headline. Only the `current` link
changed. Previous release kept: `20261118T060952Z`.

Back to the previous release:

    sudo ln -sfn /var/www/mdmcg/releases/20261118T060952Z /var/www/mdmcg/current

## 2026-11-18 14:58 UTC

Release `20261118T145656Z` is live (`/var/www/mdmcg/current`): one colour per signal, the reading scene builds from one noisy beat to
forty, A reading in the menu, Device page reordered, the model opens while seen, contact page at /contact/ (the old
address redirects), bars at one pace, 42 chests drawn in with a count, closing band "Two signals from one heartbeat.",
footer groups renamed. Uploaded as the site pages only; lab, v1 and platform were copied on the server from the previous
release (identical, checked locally). Previous release kept: `20261118T070847Z`.

Back to the previous release:

    sudo ln -sfn /var/www/mdmcg/releases/20261118T070847Z /var/www/mdmcg/current

## 2026-11-18 18:06 UTC

Release `20261118T180414Z` is live (`/var/www/mdmcg/current`): email subject "mdmcg: a question about the device", an
"Ask the founders about it" button at the end of the last home scene, Device and A reading, first-screen second button
to A reading, phone fixes (scene dots and links to a scene land with the headline in view and add nothing to the Back
button; the menu scrolls on a phone on its side), longer page titles, the field named once on Science, "typical chest"
wording, favicon.ico. Uploaded as the site pages only; lab, v1 and platform were copied on the server from the previous
release (identical, checked locally). Every link followed on the live site with `site/scripts/check-links.mjs`: 44
destinations, 0 failures. Previous release kept: `20261118T145656Z`.

Back to the previous release:

    sudo ln -sfn /var/www/mdmcg/releases/20261118T145656Z /var/www/mdmcg/current
