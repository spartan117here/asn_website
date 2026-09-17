# ASN Imports Exports — site

Marketing site for ASN Imports Exports (Akash Group of Enterprises). Built as
a plain Vite + vanilla JS project — no framework, because this site is
content-and-motion driven, not app-state driven. GSAP (ScrollTrigger +
MotionPathPlugin) handles all animation.

## Run it

```bash
npm install
npm run dev       # local dev server with HMR
npm run build     # production build → /dist
npm run preview   # serve the production build locally
```

Requires Node 18+.

## Structure

```
index.html          all markup — one page, sectioned, no templating layer
src/style.css        design tokens (:root) + one stylesheet, BEM-ish naming
src/main.js           all GSAP choreography, in one file, split into
                       clearly commented blocks (preloader, hero route map,
                       header state, marquee, scroll reveals, world map)
src/assets/logo.png    your logo, unmodified, at its original 537×446
```

No component framework, no build-time templating, no CMS — intentionally.
It's four files. If this grows into a multi-page site or needs a CMS later,
that's the point to introduce something like Astro rather than retrofitting
this one.

## Design system

- **Palette** — sampled directly from your logo: deep navy (`--navy-900`
  `#0A1B33`) and gold (`--gold-500` `#D9A441`), with ivory/paper for light
  sections instead of a pure white.
- **Type** — Big Shoulders Display (condensed, industrial — reads like
  stenciled crate/container lettering) for headlines, Inter for body copy,
  IBM Plex Mono for the small manifest-style labels ("WAYBILL /",
  "SVC / IMP–EXP"). All three load from Google Fonts in `index.html`.
- **Motif** — a shipping-manifest / waybill visual language runs through
  the whole site (route lines, origin/destination nodes, mono data tags)
  instead of stock photography, so the whole thing is self-contained —
  nothing hot-linked, nothing that breaks if an image host goes down.

## Content that's real vs. placeholder

Everything in the Contact section (phone, email, site URL, office address)
and the founder/services copy comes straight from the assets you sent. Two
things are intentionally placeholders you should swap before launch:

1. **`.about__frame`** — currently a navy tile with "AK" as a monogram in
   place of a founder photo. Drop in a real photo of Akash and remove the
   `.about__frame span` monogram.
2. **Contact form** — `#contactForm` is front-end only right now; submitting
   it just clears the form and shows a note. Wire it to whatever you're
   using for form handling (a serverless function, Formspree, your own
   backend) in `src/main.js`.

## Working on it further

This is a clean handoff point for Antigravity or any other editor/agent —
everything is plain HTML/CSS/JS with no build magic beyond Vite's default
config. Section boundaries in `index.html` are commented (`<!-- ===== -->`)
so it's easy to point an agent at one section at a time.
