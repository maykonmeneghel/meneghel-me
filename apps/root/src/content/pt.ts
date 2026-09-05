import type { RootContent } from './types';

// PLACEHOLDER — nomes e histórias reais pendentes (ver docs/CONTENT-TODO.md).
// O layout é o definitivo; o texto é rascunho para validação visual.
export const pt: RootContent = {
  meta: {
    title: 'Meneghel — uma família, um sobrenome, um ofício',
    description: 'A casa da família Meneghel: de onde viemos, o que carregamos e para onde vamos.',
  },
  hero: {
    surname: 'Meneghel',
    motto: 'Trabalho, palavra e mesa posta.',
    intro:
      'Um sobrenome não é só como te chamam. É uma lista de pessoas que decidiram, muito antes de você existir, o tipo de gente que você ia ser. Esta página é sobre elas.',
    scroll: 'desça',
  },
  origin: {
    eyebrow: 'A ORIGEM',
    title: 'De Veneto ao Paraná',
    body: [
      '«Meneghel» vem do vêneto — um diminutivo de Domenico, o nome que se dava a quem nascia no domingo, o dia do Senhor. É um sobrenome de gente do interior: da terra, da oficina, da feira.',
      'Como tantas famílias do norte da Itália, os Meneghel atravessaram o Atlântico atrás de terra para plantar e de um lugar onde o sobrenome ainda pudesse significar alguma coisa. Encontraram o sul do Brasil.',
      'PLACEHOLDER — aqui entra a história real: de que cidade vieram, em que ano chegaram, onde se estabeleceram.',
    ],
  },
  roots: {
    eyebrow: 'AS RAÍZES',
    title: 'Quem me construiu',
    lede: 'Ninguém se faz sozinho. Muito do que eu chamo de "meu jeito de trabalhar" é, honestamente, herança.',
    people: [
      { slug: 'avo-paterno', name: 'Avô paterno', role: 'PLACEHOLDER — ofício', gift: 'PLACEHOLDER — o que ele te ensinou sem nunca dizer em voz alta.' },
      { slug: 'avo-materna', name: 'Avó materna', role: 'PLACEHOLDER — ofício', gift: 'PLACEHOLDER — a lição que veio da cozinha, da fé ou do silêncio.' },
      { slug: 'pai', name: 'Meu pai', role: 'PLACEHOLDER — ofício', gift: 'PLACEHOLDER — a régua que ele deixou para o trabalho bem feito.' },
      { slug: 'mae', name: 'Minha mãe', role: 'PLACEHOLDER — ofício', gift: 'PLACEHOLDER — o cuidado, a teimosia, o estudo.' },
    ],
  },
  now: {
    eyebrow: 'O AGORA',
    title: 'A família que eu escolhi',
    lede: 'Raiz é o que te sustenta. Mas a árvore só faz sentido pelo que ela dá.',
    people: [
      { slug: 'manu', name: 'Emanuelle', role: 'Minha esposa', gift: 'PLACEHOLDER — quem ela é, em uma frase que ela aprovaria.', href: 'https://manu.meneghel.me' },
      { slug: 'filha', name: 'Nossa filha', role: 'Chegando em breve', gift: 'PLACEHOLDER — o que você quer que ela encontre pronto quando chegar.' },
      { slug: 'maykon', name: 'Maykon', role: 'Engenheiro, pai, filho', gift: 'Constrói coisas — da trilha de cobre à rede neural.', href: 'https://maykon.meneghel.me' },
    ],
  },
  values: {
    eyebrow: 'O QUE FICA',
    title: 'Os valores que atravessaram',
    items: [
      { k: 'Trabalho', v: 'PLACEHOLDER — a ideia de que ninguém deve nada a você, e isso é libertador.' },
      { k: 'Palavra', v: 'PLACEHOLDER — o combinado vale mais que o contrato.' },
      { k: 'Mesa', v: 'PLACEHOLDER — a casa está sempre aberta, e sempre tem comida.' },
      { k: 'Estudo', v: 'PLACEHOLDER — o que se aprende ninguém tira.' },
    ],
  },
  doors: {
    eyebrow: 'AS PORTAS',
    title: 'Cada um tem a sua',
    lede: 'Esta casa tem cômodos. Entre no que quiser.',
    soon: 'em breve',
  },
  footer: 'PLACEHOLDER — Feito em casa, em {cidade} — {estado}.',
};
