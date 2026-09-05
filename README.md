# meneghel.me

A family home and a playable CV, as three independently deployed static sites.

| Site | What it is | Status |
|---|---|---|
| `meneghel.me` | The family: where the surname comes from, the people who built it, what got passed down | copy is placeholder |
| `maykon.meneghel.me` | The CV you can play — nine chapters, each a working mini-game | chapter 01 playable |
| `manu.meneghel.me` | Emanuelle's page | not started |

## The idea

A CV tells you what someone can do. This one lets you try it. The chapters read
bottom-up through the stack — `SILICON → COPPER → STEEL → SIGNAL → SERVICE →
SWARM → MIND → GLASS → SYSTEM` — and every one of them ends with a single
sentence stating what the visitor just learned by playing with it.

## Running it

```sh
npm install
npm run dev        # maykon.meneghel.me on :4322
npm run dev:root   # meneghel.me on :4321
npm run build      # builds all three
```

Node 24 (see `.nvmrc`).

## Layout

```
apps/root      meneghel.me
apps/maykon    maykon.meneghel.me
apps/manu      manu.meneghel.me
packages/ui    design tokens and base stylesheet, shared by all three
infra          Terraform: S3 + CloudFront + Route 53 + GitHub OIDC
assets/raw     source material extracted from Portfolio-2024.pdf (git-ignored)
docs           what is still needed from Maykon
```

## Choices worth explaining

- **Astro, static output.** The site is mostly prose with islands of
  interactivity. Text chapters ship zero JavaScript; each mini-game hydrates
  only when it scrolls into view. Nothing here needs a server, so nothing here
  pays for one.
- **No CSS framework.** The design is bespoke and canvas-heavy; hand-written CSS
  over a token file in `packages/ui` is smaller and clearer than utility classes.
- **Three distributions, not one.** Each subdomain deploys on its own, so
  `manu.meneghel.me` can be built later on a different stack without any risk to
  the others.
- **Mini-games simulate rather than call a backend.** They are always up, cost
  nothing, and cannot embarrass anyone mid-interview. `SIGNAL` is written so the
  simulated broker can be swapped for a real AWS IoT Core connection later.

## Brand

Primary `#FF2D55`, sampled directly out of `Portfolio-2024.pdf` — which happens
to be Apple's system pink, fitting for someone who came up through the Apple
Developer Academy. Deep accent `#FF0635`.
