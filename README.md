# Grand Masters Career Sim

Learn the Umamusume **Grand Masters** scenario by playing it: a turn-by-turn career simulator with Oguri Cap and a fixed MLB deck, laid out like the game's career screen.

Live site: https://kevinpoteau.github.io/UmaGrandMaster/

## What it covers

- 78-turn career (Junior, Classic, Senior, Finale), Oguri Cap's objective races, summer camps, inheritance.
- Card placement per turn (Specialty Priority), training gains, energy, failure rate, mood, bonds, hints, friendship training.
- Knowledge Fragments and the Knowledge Table, Goddess' Wisdom (Red, Blue, Yellow), goddess levels, year-end races (GUR, WBC, SWBC) and the Grand Masters finale.
- Ancestors & Guides: first meeting, three-goddess choice, Passion Zone, goddess outings.
- Card chain events and random events with their real choices.
- Contextual help (`?` popovers), scenario tips that update every turn, and a career calendar.

Fixed setup: Oguri Cap (original outfit); Kitasan Black SPD, Agnes Tachyon SPD, Super Creek STAM, Mejiro Ramonu WIT, Fine Motion WIT and Ancestors & Guides, all MLB.

## Approximations

- Races are always won and give flat rewards (−15 energy each).
- Event timing, the three-goddess trigger rate (≈40%) and success rolls (60%) are estimates.
- Events marked ≈ in the UI have guessed effects (Mejiro Ramonu's and Oguri Cap's events are not documented in English).
- Skills are not bought; hints are listed under Skills.

## Layout

```
index.html            page markup
css/style.css         all styles (Umapastèque palette and fonts)
js/                   plain scripts, no build step, loaded in this order:
  score-table.js      stat → rating lookup for the end-of-career estimate
  data.js             constants, Oguri Cap, deck values, card and trainee events, goddess outings
  engine.js           RNG, state, card placement, training values, fragments, Wisdom, actions, end-of-turn events
  ui.js               career screen rendering, help popovers, tips, calendar, layout scaling
assets/               optional images (see assets/README.md)
scripts/playtest.mjs  headless playthrough of full careers through the UI (Playwright)
```

## Run locally

Open `index.html` in a browser, or serve the folder:

```
python3 -m http.server 8000
```

Playtest (needs Node 18+):

```
npm i -D playwright && npx playwright install chromium
node scripts/playtest.mjs 3
```

## Photo of Oguri Cap

Set `PHOTO_URL` at the top of `js/ui.js` to an image you are allowed to use (for example `assets/oguri-cap.jpg`). Leave it empty to keep the silhouette.

## Credits

- Scenario logic adapted from [UmaAi](https://github.com/hzyhhzy/UmaAi) by hzyhhzy (MIT, branch `grandmasters`, via the [xulai1001/UmaSimulator](https://github.com/xulai1001/UmaSimulator) fork). See `THIRD_PARTY_NOTICES.md`.
- Scenario and card data: [GameTora](https://gametora.com/umamusume/grand-masters) and [umamusu.wiki](https://umamusu.wiki/).
- No game artwork is included. Umamusume: Pretty Derby is © Cygames, Inc. This is an unofficial fan project.
