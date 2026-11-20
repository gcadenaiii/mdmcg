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

## 2026-11-19 07:32 UTC

Release `20261119T072512Z` is live (`/var/www/mdmcg/current`): Heart Twin page with the list of the six research tools under
the opening and a diagram of how the parts relate; one term per thing on the site and in the tools (tools, electrodes, pass
mark, tool names in place of page numbers); the tools' overall result as a count; a "Tool list" link back from every tool and
the tool's name in the phone header; the note under "Forty beats" ends "with sensor noise only"; the second run reported as
complete (84 older chests, 126 in the two runs). Uploaded as the site pages and lab; v1 and platform were copied on the
server from the previous release (identical, checked locally). Every link followed on the live site with
`site/scripts/check-links.mjs`: 44 destinations, 0 failures. robots.txt still closed. Previous release kept:
`20261118T180414Z`.

Back to the previous release:

    sudo ln -sfn /var/www/mdmcg/releases/20261118T180414Z /var/www/mdmcg/current

## 2026-11-19 08:03 UTC

Release `20261119T080106Z` is live (`/var/www/mdmcg/current`): the Evidence page reports the second run's results (1.16 times
at the tested spot, 74 of 84 chests better than the midline, 1.48 times across the zone, 0.81 kept per centimetre of depth;
the expectation that was not supported and the repaired-model values in one line). Uploaded as the site pages only; lab, v1
and platform were copied on the server from the previous release (identical, checked locally). Every link followed on the
live site: 44 destinations, 0 failures. robots.txt still closed. Previous release kept: `20261119T072512Z`.

Back to the previous release:

    sudo ln -sfn /var/www/mdmcg/releases/20261119T072512Z /var/www/mdmcg/current

## 2026-11-19 08:50 UTC

Release `20261119T084915Z` is live (`/var/www/mdmcg/current`): the wearing place moved to the spot tested in the second run
(2 cm above where the bone stops, 2 cm to the wearer's left) on Home and A reading, with the zone redrawn; "Sit still. Thirty
beats. One record."; beat figures at that spot (about 5 for the main spike, about 30 for the recovery wave; 28.3 in the bar
chart of A reading); Evidence says the device is centred at the tested spot. Uploaded as the site pages only; lab, v1 and
platform were copied on the server from the previous release (identical, checked locally). The research tools still use the
earlier midline spot. Every link followed on the live site: 44 destinations, 0 failures. robots.txt still closed.

Note: release `20261119T084735Z` was live for about two minutes before this one. The site's content check had failed on it (the
word "first" on the Evidence page, which the check forbids) and the publish command did not stop on that failure. The wording
was changed and this release published; the content check passes on it. Publish commands must stop when the content check fails.

Previous release kept: `20261119T080106Z`.

Back to the previous release:

    sudo ln -sfn /var/www/mdmcg/releases/20261119T080106Z /var/www/mdmcg/current

## 2026-11-19 09:37 UTC

Release `20261119T093547Z` is live (`/var/www/mdmcg/current`): homepage direction A. First screen with the device alone, the
size as one text line and one main button; the two traces moved to the "ECG shows half the picture" scene, labelled "One
computed heartbeat"; the two device scenes merged ("Two soft wings. Its own ECG."); menu Device, A reading, Evidence, Team,
Research (Heart Twin, Science, Research tools), Contact, and the same Research group in the footer; the "42" band as a headline
with three plain rows; the Heart Twin block replaced by a one-line Research row; on a phone each picture scrolls with its
text; first paint matches the final layout. The content check was run as its own gate and passed before the release was
assembled. Uploaded as the site pages only; lab, v1 and platform copied on the server from the previous release (identical,
checked locally). Every link followed on the live site: 43 destinations, 0 failures. robots.txt still closed. Previous release
kept: `20261119T084915Z`.

Back to the previous release:

    sudo ln -sfn /var/www/mdmcg/releases/20261119T084915Z /var/www/mdmcg/current

## 2026-11-19 09:50 UTC

Release `20261119T094009Z` is live (`/var/www/mdmcg/current`): the size line on the first screen in the main font; the Heart Twin
page no longer pins its picture on a phone (each picture scrolls with its step). Content check passed as its own gate.
Uploaded as the site pages only; lab, v1 and platform copied from the previous release (identical). Every link followed on
the live site: 0 failures. Previous release kept: `20261119T093547Z`.

Back to the previous release:

    sudo ln -sfn /var/www/mdmcg/releases/20261119T093547Z /var/www/mdmcg/current

## 2026-11-19 10:25 UTC

Release `20261119T102322Z` is live (`/var/www/mdmcg/current`): the research tools moved to the wearing spot tested in the second run
(2 cm above the lower end of the breastbone, 2 cm to the wearer's left). Their data were recomputed at that spot for the 42
chests (`exploration/pocket_card/app_*_spot_2026_11_19.py`); the wire-sensor values equal the placement run's saved table at
that position chest by chest, and the pocket and under-the-breast places equal the earlier data exactly. Content check passed
as its own gate. Uploaded as the site pages and lab; v1 and platform copied from the previous release (identical). Every link
followed on the live site: 43 destinations, 0 failures. Previous release kept: `20261119T094009Z`.

Back to the previous release:

    sudo ln -sfn /var/www/mdmcg/releases/20261119T094009Z /var/www/mdmcg/current

## 2026-11-19 16:05 UTC

Release `20261119T160252Z` is live (`/var/www/mdmcg/current`): fixes from the final readiness review. Device page wearing place
(2 cm above, 2 cm to your left; zone; 1 cm to the right costs 1.2 times; gap about 5 mm, 4.8 mm at the spot); the opening
picture on Home stays on screen from first paint (no hide and fade) and the scene dots start hidden; caption "Computed
heartbeats, averaged" under the averaging figure; A reading states "with sensor noise only" and labels its bar as the tested
spot; on a phone the hospital-study figure comes before the sentence that refers to it. Research tools: tolerance table around
the new spot, side view cut through the device, number check re-pointed. Content check passed as its own gate. Uploaded as
the site pages and lab; v1 and platform copied from the previous release (identical). Live checks: 43 link destinations, 0
failures; the opening picture sampled on every frame for 3.5 s on three loads, never hidden once shown. Previous release kept:
`20261119T102322Z`.

Back to the previous release:

    sudo ln -sfn /var/www/mdmcg/releases/20261119T102322Z /var/www/mdmcg/current

## 2026-11-19 16:46 UTC

Release `20261119T164431Z` is live (`/var/www/mdmcg/current`): fixes from the repeat readiness review. The 3D stage on Home is set up
in short steps with its materials compiled in the background (the longest stop on a first desktop visit measured 599, 623
and 607 ms on the live site over three fresh launches, against 2.3 to 4.0 s before; a scroll sent during loading moved the
page within 66 ms). Team: the certification line says "at an earlier company". Science: beat figures say "with sensor noise
only". Evidence: tolerance tiles labelled "Measured from the midline spot". Home: the Fit line names the zone from the middle
of the chest. A reading: the ordinary-room sentence in times (about 25 seconds and about 5.7 minutes), an exception to the
content check that the owner approved by name on 2026-11-19 (`ALLOWED` in `site/scripts/check-content.mjs`). Phone: the "why"
heading lines up with the others. Content check passed as its own gate. Site pages only; lab, v1 and platform copied from the
previous release (identical). 43 link destinations, 0 failures. Previous release kept: `20261119T160252Z`.

Back to the previous release:

    sudo ln -sfn /var/www/mdmcg/releases/20261119T160252Z /var/www/mdmcg/current

## 2026-11-19 18:56 UTC

Release `20261119T185349Z` is live (`/var/www/mdmcg/current`): the Product Build page at `/product-build/`, under Research in
the menu and the footer. It is the internal program workspace: schedule with dependencies and critical path, labor and budget
with three scenarios, sourcing and lifecycle table, requirements and traceability, risks, stage gates, security plan. Its data
is published only as an encrypted file (`/product-build/payload.json`, AES-256-GCM, key from the owner's access code set in
`site/.env`); the page shows one access code field. Gates before upload, each on its own: 51 tests passed (they include a
search of the built site for internal text), content check "11 pages checked, 0 problem(s)". Site pages only; lab, v1 and
platform copied from the previous release (identical). Live checks: 44 link destinations, 0 failures; the data file is the
encrypted envelope; a wrong code is refused on desktop and phone and the workspace stays empty; the page and its script files
were searched for internal figures and names, none found (the status label names are part of the public page code).
Nothing on the server was changed apart from the new release folder and the `current` link. Previous release kept:
`20261119T164431Z`. Not pushed to the remote repository: the commits hold the program's rates and budget in plain source.

Back to the previous release:

    sudo ln -sfn /var/www/mdmcg/releases/20261119T164431Z /var/www/mdmcg/current

## 2026-11-20 09:27 UTC

Release `20261120T092510Z` is live (`/var/www/mdmcg/current`): one product, designed round option 2. The device is the TMR
option (60 x 32 x 6 mm core, sky-blue ring) with thin clear arms and printed conductors in place of the woven wings; every
device picture re-rendered from the 3D model; a new "In the hand" section on Device (the device on a palm, and a side view);
reading figures for option 2 (Home says "Forty beats"; A reading gives 22 seconds for the main spike, 31 seconds to see the
recovery wave and 5.7 minutes for the full ECG and MCG record, the sentence the owner approved by name, updated in
`ALLOWED`). Company Plan: the battery plan is removed (two plans, ECG/MCG and Funding, plus Reference and history);
`/plan/battery/` now answers 404. Research tools re-imported: option 2 is the chosen design, the options at a glance show
the noise used, the noise the quick check needs, whether the part can be bought and why the time is what it is, with two
times per option and no upper bound. Gates before upload, each on its own: 75 tests passed, content check "14 pages checked,
0 problem(s).", tools import leak check passed. Live checks: 44 link destinations, 0 failures; the plan data file is the
encrypted envelope; Device sections looked at in screenshots. Nothing on the server was changed apart from the new release
folder and the `current` link. Previous release kept: `20261119T185349Z`.

Back to the previous release:

    sudo ln -sfn /var/www/mdmcg/releases/20261119T185349Z /var/www/mdmcg/current
