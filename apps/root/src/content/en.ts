import type { RootContent } from './types';

// PLACEHOLDER — real names and stories pending (see docs/CONTENT-TODO.md).
// The layout is final; the copy is a draft for visual validation.
export const en: RootContent = {
  meta: {
    title: 'Meneghel — one family, one surname, one trade',
    description: 'The Meneghel family home: where we came from, what we carry, and where we are going.',
  },
  hero: {
    surname: 'Meneghel',
    motto: 'Work, word, and a table always set.',
    intro:
      'A surname is not just what people call you. It is a list of people who decided, long before you existed, what kind of person you were going to be. This page is about them.',
    scroll: 'scroll',
  },
  origin: {
    eyebrow: 'THE ORIGIN',
    title: 'From the Veneto to Paraná',
    body: [
      '"Meneghel" comes from the Venetian — a diminutive of Domenico, the name given to those born on Sunday, the Lord’s day. It is a countryside surname: of the land, the workshop, the market stall.',
      'Like so many families from northern Italy, the Meneghels crossed the Atlantic looking for land to farm and a place where a surname could still mean something. They found southern Brazil.',
      'PLACEHOLDER — the real story goes here: which town they left, what year they arrived, where they settled.',
    ],
  },
  roots: {
    eyebrow: 'THE ROOTS',
    title: 'The people who built me',
    lede: 'Nobody makes themselves. Most of what I call "the way I work" is, honestly, inherited.',
    people: [
      { slug: 'grandfather', name: 'My grandfather', role: 'PLACEHOLDER — trade', gift: 'PLACEHOLDER — what he taught you without ever saying it out loud.' },
      { slug: 'grandmother', name: 'My grandmother', role: 'PLACEHOLDER — trade', gift: 'PLACEHOLDER — the lesson that came from the kitchen, the faith, or the silence.' },
      { slug: 'father', name: 'My father', role: 'PLACEHOLDER — trade', gift: 'PLACEHOLDER — the standard he set for work done properly.' },
      { slug: 'mother', name: 'My mother', role: 'PLACEHOLDER — trade', gift: 'PLACEHOLDER — the care, the stubbornness, the studying.' },
    ],
  },
  now: {
    eyebrow: 'THE PRESENT',
    title: 'The family I chose',
    lede: 'Roots hold you up. But a tree only makes sense for what it gives.',
    people: [
      { slug: 'manu', name: 'Emanuelle', role: 'My wife', gift: 'PLACEHOLDER — who she is, in one sentence she would approve of.', href: 'https://manu.meneghel.me' },
      { slug: 'daughter', name: 'Our daughter', role: 'Arriving soon', gift: 'PLACEHOLDER — what you want ready and waiting for her.' },
      { slug: 'bebel', name: 'Bebel', role: 'The dog', gift: 'She has been everywhere in this house for years — including inside an app I built, where she ended up as the sample profile. PLACEHOLDER — breed, age, and how she arrived.' },
      { slug: 'maykon', name: 'Maykon', role: 'Engineer, father, son', gift: 'Builds things — from the copper trace to the neural network.', href: 'https://maykon.meneghel.me' },
    ],
  },
  values: {
    eyebrow: 'WHAT REMAINS',
    title: 'The values that made it through',
    items: [
      { k: 'Work', v: 'PLACEHOLDER — nobody owes you anything, and that turns out to be freeing.' },
      { k: 'Word', v: 'PLACEHOLDER — the handshake outranks the contract.' },
      { k: 'Table', v: 'PLACEHOLDER — the house is always open, and there is always food.' },
      { k: 'Study', v: 'PLACEHOLDER — what you learn, nobody can take.' },
    ],
  },
  doors: {
    eyebrow: 'THE DOORS',
    title: 'Everyone gets their own',
    lede: 'This house has rooms. Walk into whichever you like.',
    soon: 'soon',
  },
  footer: 'PLACEHOLDER — Made at home, in {city} — {state}.',
};
