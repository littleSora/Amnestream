
<div align="center">

# amnestream.

**A fast, themeable anime streaming site with sub / dub, server failover and optional cloud sync.**
No backend, no build step: plain HTML, CSS and JavaScript.

![Static site](https://img.shields.io/badge/static%20site-no%20build-9db4ff?style=flat-square)
![Vanilla JS](https://img.shields.io/badge/vanilla-JavaScript-f7df1e?style=flat-square&logo=javascript&logoColor=black)
![PWA](https://img.shields.io/badge/installable-PWA-5a0fc8?style=flat-square)
![Themes](https://img.shields.io/badge/themes-18%20%2B%208%20presets-ff71ce?style=flat-square)

<img width="1920" height="927" alt="home" src="https://github.com/user-attachments/assets/af2b2319-6d13-40cd-a5cd-7536bd14fe9c" />

</div>

> [!NOTE]
> Amnestream does not host any video. Episodes are embedded from third-party players, and titles and artwork come from the public [AniList](https://anilist.co) API. See the [disclaimer](#disclaimer).

> [!TIP]
> If a server shows an error, use the server dropdown on the watch page or press **Reload player**. The site also fails over to the next server on its own.

## Screenshots

|                                          Home                                          |                               Browse                               |
| :------------------------------------------------------------------------------------: | :----------------------------------------------------------------: |
| <img width="1920" height="929" alt="rows" src="https://github.com/user-attachments/assets/e82b1cac-3557-471a-92c8-20198f84d6d7" /> | <img width="1920" height="929" alt="browse" src="https://github.com/user-attachments/assets/c8290193-6a9e-4e1c-9a35-da2d7c6eb327" />


<div align="center">
<img width="1920" height="920" alt="watch" src="https://github.com/user-attachments/assets/a773e962-0df7-4f6a-9ed5-07b6df3b1451" />
</div>

## Features

- **Browse and search** about 20,000 titles, with filters for genre, type, status, season and year. Pick two genres and the results are ranked by how well they match both.
- **Watch** with Sub or Dub, several servers, automatic failover, auto-next, and per-episode comments. Dub is detected per episode, so missing dubs are crossed out.
- **Episode lists your way:** Cards, Compact or Numbers, first-to-latest or latest-first, with real episode previews and titles. Works the same on the details page and the watch page.
- **Seasons row** on every show: every season, movie and OVA in order.
- **Continue watching,** My List, favourites, watch history and an airing **timeline**.
- **18 themes and 8 colour presets** (Retro 96, Cyberpunk, Wave, Voxel, Terminal, Parchment, Pea LCD and more), plus a custom accent colour and a photo background.
- **Works on any device.** Phones get a bottom navigation bar and layouts built for small screens; the PWA installs like an app.
- **Optional account** (Supabase) to sync your list and progress across devices, or move them with a sync code and no account.
- **Private by default:** settings, list and history live in your browser. Incognito mode pauses history.

## Run it

Quickest: open `index.html` in a browser. Recommended (the service worker and baked catalog need `http://`, not `file://`):

```bash
# Python
python3 -m http.server 8080

# or Node
npx serve .
```

Then open <http://localhost:8080>. There is nothing to install or build.

| Windows                  | Linux / macOS                 |
| :----------------------- | :---------------------------- |
| `py -m http.server 8080` | `python3 -m http.server 8080` |

**Accounts and sync (optional).** Create a Supabase project, put its Project URL and public anon key in `js/config.js`, then run the SQL files in `supabase/` once each in the Supabase SQL editor. Both values are public by design; data is protected by row-level security rules.

**After changing files.** Bump `VERSION` in `sw.js` (for example `amnestream-v65` to `v66`) so every device drops its cached copy.

## Project layout

| Path                                                            | What it is                                                                                                       |
| :-------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------- |
| `index.html`, `browse.html`, `anime.html`, `watch.html`         | Home, Browse, Details and the Player                                                                             |
| `mylist.html`, `timeline.html`, `profile.html`, `settings.html` | Your list, airing timeline, profile and settings                                                                 |
| `js/`                                                           | Vanilla JavaScript: `api.js` (AniList, caching), `common.js` (shared helpers, settings, sync), one file per page |
| `css/`                                                          | `style.css` base, `atlas.css` and `me.css` page styles, `mobile.css` phone layer, `themes.css` every theme       |
| `data/catalog.json`                                             | Pre-baked catalog for an instant first paint                                                                     |
| `sw.js`, `manifest.webmanifest`, `icons/`                       | PWA shell                                                                                                        |
| `docs/`                                                         | [DMCA policy](docs/DMCA.md)                                                                                      |

## Built with

| Part                | Tech                                                            |
| :------------------ | :-------------------------------------------------------------- |
| Pages and logic     | HTML, CSS and vanilla JavaScript. No framework, no npm packages |
| Catalog data        | AniList GraphQL API                                             |
| Episode previews    | AniList, then [ani.zip](https://ani.zip) when AniList has none  |
| Video               | Third-party embedded players in an `<iframe>`                   |
| Accounts and sync   | Supabase Auth plus a `user_data` table                          |
| Install and offline | Service worker and web app manifest                             |


## Known limits

- AniList rate limits (about 90 requests a minute per IP) mean heavy browsing can briefly slow results.
- Video depends entirely on third-party providers, which can go down or change URLs without notice. That is why the server list and failover exist.
- Dub availability is detected, not guaranteed.
- Episode previews depend on AniList and ani.zip. Very new or obscure shows may only show the anime's artwork.
- The animated themes (RGB, Wave, Void) redraw constantly and can be slow on older devices. Settings warns about them.

## Disclaimer

Amnestream is not affiliated with AniList, MegaPlay, MegaVid, Anixo or any studio, publisher or streaming service. It does not host, upload or store any video files. Titles, artwork and trademarks belong to their owners.

If you are a copyright owner and want something removed, read the **[DMCA policy](docs/DMCA.md)** (also on the site as [`dmca.html`](dmca.html)) and email **m4cky5467@gmail.com**. Please do not post notices as public issues.
