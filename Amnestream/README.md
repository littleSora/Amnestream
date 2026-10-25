# Amnestream

A static anime streaming website. Browse, search, filter, read details, and watch episodes with sub/dub switching. It has **no backend, no build step, and no API keys**. It is just files that run in the browser.

## What it's made of

| Part              | Language / tech                                                                                       |
| ----------------- | ----------------------------------------------------------------------------------------------------- |
| Pages             | **HTML** (`*.html`)                                                                                   |
| Styling           | **CSS** (`css/`)                                                                                      |
| Logic             | **Vanilla JavaScript** (`js/`), with no framework and no npm packages                                 |
| Data              | **AniList GraphQL API** (queries are written in GraphQL, sent from JavaScript)                        |
| Video             | Embedded player (MegaPlay), loaded in an iframe                                                       |
| Offline / install | Service worker (`sw.js`) and web manifest (`manifest.webmanifest`), so it works as an installable PWA |
| Saved data        | Browser `localStorage` (watchlist, progress, settings, accounts)                                      |

Because it is plain HTML/CSS/JS, you can edit any file in a text editor and refresh the browser.

## How to run it

**Quickest:** open `index.html` in your browser.

**Recommended** (some features, like the service worker and the baked catalog, need `http://` and don't work from `file://`): run a tiny local server from this folder.

```bash
# Python
python3 -m http.server 8080

# or Node
npx serve .
```

Then open <http://localhost:8080>.

## How to deploy

The site is 100% static. Upload or drag the folder to any static host:

- Netlify
- Vercel
- Cloudflare Pages
- GitHub Pages

## Pages

| File                                | What it does                                                                                                                                     |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `index.html`                        | Home: spotlight carousel, Top 10, rails, Discover picker (Top airing, Latest episodes, This season, Top rated), **Estimated schedule**, upcoming |
| `browse.html`                       | Search and filters (genre, type, status, season, year, sort, including "Latest episodes") with paging. 18+ titles follow Settings                |
| `anime.html`                        | Details page: poster, info, synopsis, episodes, relations, recommendations, characters                                                           |
| `watch.html`                        | Player: sub/dub, server switch, episode list, auto-next                                                                                          |
| `mylist.html`                       | Watchlist and continue watching                                                                                                                  |
| `timeline.html`                     | Airing shows from your watched titles                                                                                                            |
| `profile.html` / `leaderboard.html` | Profile and leaderboard                                                                                                                          |
| `settings.html`                     | App settings (for example, show 18+ titles)                                                                                                      |
| `dmca.html`                         | DMCA / legal page                                                                                                                                |

## How it works

- **Catalog and info** come from the free AniList GraphQL API. `js/api.js` tries the aniraku mirror first and falls back to the official `graphql.anilist.co` if a host is down, rate limited, or returns a bad answer.
- **Caching:** answers are cached in memory and in `sessionStorage`, so going back to a page is instant.
- **Estimated schedule** is fixed to GMT+8 (Manila) with a 12-hour clock.
- **Playback:** the player embeds `https://megaplay.buzz/stream/ani/{anilistId}/{episode}/{sub|dub}`. A MAL-ID fallback server is in the server dropdown.
- **Your data** (watchlist, progress, language, server choice) lives only in your browser's `localStorage`. Clearing site data resets it.

## Handy tips

- **Force a host (testing):** add `?host=official` to the URL to use the official AniList host first. Use `?host=0` to clear it.
- **Skip the baked catalog:** add `?live=1` to always load live data. Use `?live=0` to turn it back off.
- **After editing files**, if you don't see the change, bump `VERSION` in `sw.js` (change the number, for example `amnestream-v1` to `amnestream-v2`) or hard refresh (Ctrl+Shift+R) so the service worker drops its old copy.
- **18+ titles** are hidden by default. Turn them on in **Settings** (the `includeAdult` option).

## Limits

- AniList allows roughly 90 requests per minute per IP, so the app batches queries and throttles requests.
- The API doesn't say whether a sub or dub exists, so both buttons always show. If one fails, switch servers.

## Credits and legal

Anime data comes from AniList. Videos are served by third-party embeds, and Amnestream doesn't host any video. See `dmca.html`.
