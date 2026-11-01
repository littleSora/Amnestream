# Amnestream

A static anime streaming website. Browse and search a large catalog, read details, and watch episodes with sub/dub and server switching. There is no backend of our own: the site is plain HTML, CSS and JavaScript files, with AniList for data, third-party embeds for video, and Supabase for optional accounts and sync.

---

## Table of contents

1. [What it's made of](#1-what-its-made-of)
2. [How to run it](#2-how-to-run-it)
3. [Project layout](#3-project-layout)
4. [How it works](#4-how-it-works)
5. [How it is done (feature internals)](#5-how-it-is-done-feature-internals)
6. [Settings, data and privacy](#6-settings-data-and-privacy)
7. [Known limits](#7-known-limits)
8. [DMCA and copyright](#8-dmca-and-copyright)
9. [Credits](#9-credits)

---

## 1. What it's made of

| Part              | Tech                                                                                      |
| ----------------- | ----------------------------------------------------------------------------------------- |
| Pages             | HTML (`*.html`)                                                                           |
| Styling           | CSS (`css/`)                                                                              |
| Logic             | Vanilla JavaScript (`js/`), no framework, no npm packages                                 |
| Catalog data      | AniList GraphQL API (queries written in GraphQL, sent from JavaScript)                    |
| Video             | Third-party embedded players loaded in an `<iframe>` (MegaVid, MegaPlay, Anixo, ...)      |
| Install / offline | Service worker (`sw.js`) and `manifest.webmanifest`, so it installs as a PWA              |
| Accounts / sync   | Supabase Auth + a `user_data` table (`supabase/sync.sql`), keys in `js/config.js`         |
| Local data        | Browser `localStorage` (list, progress, settings, server health, dub availability)        |

Because it is plain files, you can edit anything in a text editor and refresh.

## 2. How to run it

Quickest: open `index.html` in a browser.

Recommended (the service worker and baked catalog need `http://`, not `file://`):

```bash
# Python
python3 -m http.server 8080

# or Node
npx serve .
```

Then open <http://localhost:8080>.

**Accounts and sync (optional).** Create a Supabase project, put its Project URL and public anon key in `js/config.js`, and run `supabase/sync.sql` once in the Supabase SQL editor. Both values in `config.js` are public by design; data is protected by row-level security rules, not by hiding the key.

**After changing files.** Bump `VERSION` in `sw.js` (for example `amnestream-v53` to `v54`) so every device drops its cached copy.

## 3. Project layout

| File | What it does |
| ---- | ------------ |
| `index.html` / `js/home.js` | Home: spotlight carousel, Top 10, rails, **Discover** picker (Top airing, This season, Top rated), Latest episodes row, schedule, upcoming |
| `browse.html` / `js/browse.js` | Discover/Browse: title search and filters (genres, type, status, season, year, sort) with paging |
| `anime.html` / `js/anime.js` | Details: poster, info, synopsis, episode list, episode preview popup, relations, recommendations, characters |
| `watch.html` / `js/watch.js` | Player page: sub/dub, server list, episode list, auto-next, failover |
| `mylist.html`, `timeline.html`, `profile.html`, `leaderboard.html`, `settings.html` | List and progress, airing timeline, profile, leaderboard, settings |
| `dmca.html` | DMCA and copyright page |
| `js/api.js` | All AniList queries, caching, throttling, genre ranking, counting |
| `js/common.js` | Shared helpers: cards, rails, storage (`Store`), settings, dub tracking (`Dub`), cloud sync (`Sync`), toasts |
| `js/player.js` | Reusable multi-provider player module |
| `sw.js`, `manifest.webmanifest`, `icons/` | PWA shell |
| `data/catalog.json` | Pre-baked catalog data for instant first paint |
| `supabase/sync.sql` | Table and security rules for cloud sync |

## 4. How it works

### Data
Titles, artwork, scores, genres, episode counts and airing times come from the free **AniList GraphQL API**. `js/api.js` sends the queries, throttles them (AniList allows roughly 90 requests per minute per IP), and caches answers in memory and `sessionStorage` so going back to a page is instant. Common first-paint data is baked into the page so the home and the unfiltered Discover page need no network at all.

### Video
The site never stores or serves video. The watch page builds an embed URL from the AniList id (or MAL id for the MAL servers) and loads it in an iframe, for example `https://megaplay.buzz/stream/ani/{anilistId}/{episode}/{sub|dub}`. The providers return the actual stream.

### Your data
Your list, favourites, progress, watch history, language and server choice are saved in your browser. If you sign in, they also sync to your Supabase account so every device matches. Merge rules: progress keeps the newest entry per title, watched episodes are combined, and list changes follow whichever device changed last.

## 5. How it is done (feature internals)

### Multi-genre ranking in Discover
Pick two or more genres (for example Action + Romance) and results are ordered in tiers by `Api.browseRanked`:

1. **Tier 1: every picked genre.** Titles that have all of them, ordered by the sort you chose (Most popular, Trending, Highest rated, ...).
2. **Tier 2: subtle matches.** Once tier 1 runs out, titles that have one picked genre and only lean toward the other through AniList tags. For Action + Romance that means Action titles with romantic tags (Love Triangle, Unrequited Love, ...) and Romance titles with action tags (Martial Arts, Swordplay, ...). The two lists take turns (round robin), each ordered by your sort.

Details:
- The tag lists live in `SUBTLE_TAGS` in `js/api.js`; edit them to change what counts as "subtle". Tags must rank at least 35 on AniList.
- Tier 2 queries exclude the other picked genres as real genres, so nothing appears twice.
- Paging works across the tiers: a page can be the end of tier 1 and the start of tier 2, and the result count is the sum of both.
- Tag-style picks (Isekai, Military, ...) are not mixed into tiers; with those, only titles matching every pick show.
- "Best match" is not in the sort list. It still applies automatically while you type a title, and the button then reads "Best match".
- With one genre or none, the normal sorted listing is used, including the exact count and deep paging past AniList's 5,000-title cap.

### Dub detection
Neither AniList nor the providers say whether a dub exists, so the site finds out:

- **Up front.** `Dub.probe` asks the MegaVid and MegaPlay servers for the dub URL. If both answer "not found", DUB is crossed out for that episode. If episode 1 has no dub, the whole show is marked.
- **By learning.** If a probe can't be read (a server may block cross-origin reads) and a dub fails to start on three servers, that episode is marked as having no dub.
- **Effect.** A crossed-out DUB can't be picked on the watch page, the episode list or the preview popup. Opening a dub link for such an episode plays Sub and says so. Marks expire after 2 days and clear themselves if a dub plays.

### Server failover on the watch page
- Servers are tried in priority order. Health is remembered per server **and per language** for 30 minutes, so a server with no dub is not benched for Sub.
- On load the page also requests the embed URL directly; an error status (404, 5xx) swaps to the next server immediately. Servers that give no readable answer are covered by a 7-second timeout, since only a message from the player proves it works.
- Raw provider error pages are never shown. A cover stays over the player until it reports ready. If every server fails, the player shows **"Server error. Please swap to another server."** with Swap server and Reload buttons.
- A dub that three servers can't start is treated as missing and the page falls back to Sub.

### Latest episodes
The home page has a Latest episodes row (with a link to Browse) and Browse has a "Latest episodes" sort that lists shows aired in the last 7 days. The Home Discover picker intentionally does not repeat it.

### Other pieces
- **Dropdowns** are custom lists on top of hidden `<select>` elements, so they match the theme and work on phones as bottom sheets.
- **Estimated schedule** is fixed to GMT+8 (Manila) with a 12-hour clock.
- **18+ titles** are hidden unless enabled in Settings.

## 6. Settings, data and privacy

- Passwords are handled by Supabase Auth and never stored by the site. Each user can only read and edit their own rows.
- "Remember me" off keeps the login only until the tab closes.
- Settings stay per browser; use the Sync code in Settings to move them.
- The supabase-js library loads from jsDelivr only when someone signs in or opens the login popup.
- Clearing site data resets everything stored locally.

## 7. Known limits

- AniList rate limits mean heavy browsing can briefly slow results.
- Video availability depends entirely on third-party providers, which can go down or change URLs without notice. The server list and failover exist for that reason.
- Dub availability is detected, not guaranteed; a provider that blocks the check may still show DUB as available until a failure is learned.
- Genre "subtle" matching depends on AniList's tag data, so some titles will not rank where you expect.

## 8. DMCA and copyright

> This section describes the project's policy. It is not legal advice. If you operate this site publicly, have a lawyer review it and make sure the contact details are yours.

### What Amnestream is
Amnestream is a free website for browsing anime and watching it through embedded players. It does not host, upload or store any video files. Episode players are embedded from third-party providers, and titles, artwork and descriptions come from the public AniList API.

### Our approach
We respect the rights of copyright owners. When we receive a valid notice, we will remove the title, link or embed it points to and tell the sender when that is done. We cannot delete files we do not host, so for the video itself a notice should also go to the provider that serves it.

### Sending a takedown notice
Under 17 U.S.C. § 512(c)(3), a notice must be in writing and include:

1. Your physical or electronic signature, or that of a person authorized to act for the copyright owner.
2. The copyrighted work you say is being infringed. A link to the official release helps.
3. The material on Amnestream you want removed, with its address (for example the `anime.html` or `watch.html` link) so it can be found.
4. Your name, mailing address, phone number and email address.
5. A statement that you believe in good faith that the use is not authorized by the copyright owner, its agent or the law.
6. A statement that the information in the notice is accurate and, under penalty of perjury, that you are the owner or are authorized to act for the owner.

Send it by email to **m4cky5467@gmail.com**. Please do not post notices as public issues, because that would publish your personal details.

### Counter-notices
If you believe material was removed by mistake or misidentification, send a counter-notice to the same address including:

1. Your physical or electronic signature.
2. The material that was removed and where it appeared before removal.
3. A statement, under penalty of perjury, that you believe in good faith it was removed by mistake or misidentification.
4. Your name, address and phone number, a statement that you consent to the jurisdiction of the federal court for your address (or, outside the United States, any district where we can be found), and that you will accept service from the person who sent the original notice.

The counter-notice is passed to the sender. Unless they tell us within 10 to 14 business days that they have filed a court action, the material may be restored.

### False claims
Anyone who knowingly misrepresents that material is infringing, or that it was removed by mistake, may be liable for damages under 17 U.S.C. § 512(f).

### Third parties and trademarks
Amnestream is not affiliated with AniList, MegaPlay, MegaVid, Anixo or any studio, publisher or streaming service. Titles, artwork and trademarks belong to their owners. The same policy is published on the site at `dmca.html`.

## 9. Credits

Anime data and artwork metadata: [AniList](https://anilist.co). Accounts and sync: [Supabase](https://supabase.com). Video is served by third-party embeds; Amnestream does not host any video.
