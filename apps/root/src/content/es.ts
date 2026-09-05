import type { RootContent } from './types';

// PLACEHOLDER — nombres e historias reales pendientes (ver docs/CONTENT-TODO.md).
// El layout es el definitivo; el texto es un borrador para validación visual.
export const es: RootContent = {
  meta: {
    title: 'Meneghel — una familia, un apellido, un oficio',
    description: 'La casa de la familia Meneghel: de dónde venimos, qué llevamos y hacia dónde vamos.',
  },
  hero: {
    surname: 'Meneghel',
    motto: 'Trabajo, palabra y mesa puesta.',
    intro:
      'Un apellido no es solo cómo te llaman. Es una lista de personas que decidieron, mucho antes de que existieras, qué clase de persona ibas a ser. Esta página trata de ellas.',
    scroll: 'desliza',
  },
  origin: {
    eyebrow: 'EL ORIGEN',
    title: 'Del Véneto a Paraná',
    body: [
      '«Meneghel» viene del véneto — un diminutivo de Domenico, el nombre que se daba a quien nacía en domingo, el día del Señor. Es un apellido de gente del campo: de la tierra, del taller, del mercado.',
      'Como tantas familias del norte de Italia, los Meneghel cruzaron el Atlántico buscando tierra para sembrar y un lugar donde el apellido todavía significara algo. Encontraron el sur de Brasil.',
      'PLACEHOLDER — aquí va la historia real: de qué pueblo salieron, en qué año llegaron, dónde se establecieron.',
    ],
  },
  roots: {
    eyebrow: 'LAS RAÍCES',
    title: 'Quienes me construyeron',
    lede: 'Nadie se hace solo. Casi todo lo que llamo «mi forma de trabajar» es, honestamente, heredado.',
    people: [
      { slug: 'abuelo', name: 'Mi abuelo', role: 'PLACEHOLDER — oficio', gift: 'PLACEHOLDER — lo que te enseñó sin decirlo nunca en voz alta.' },
      { slug: 'abuela', name: 'Mi abuela', role: 'PLACEHOLDER — oficio', gift: 'PLACEHOLDER — la lección que vino de la cocina, de la fe o del silencio.' },
      { slug: 'padre', name: 'Mi padre', role: 'PLACEHOLDER — oficio', gift: 'PLACEHOLDER — el listón que dejó para el trabajo bien hecho.' },
      { slug: 'madre', name: 'Mi madre', role: 'PLACEHOLDER — oficio', gift: 'PLACEHOLDER — el cuidado, la terquedad, el estudio.' },
    ],
  },
  now: {
    eyebrow: 'EL PRESENTE',
    title: 'La familia que elegí',
    lede: 'Las raíces te sostienen. Pero un árbol solo tiene sentido por lo que da.',
    people: [
      { slug: 'manu', name: 'Emanuelle', role: 'Mi esposa', gift: 'PLACEHOLDER — quién es ella, en una frase que aprobaría.', href: 'https://manu.meneghel.me' },
      { slug: 'hija', name: 'Nuestra hija', role: 'Llega pronto', gift: 'PLACEHOLDER — lo que quieres que encuentre ya listo al llegar.' },
      { slug: 'maykon', name: 'Maykon', role: 'Ingeniero, padre, hijo', gift: 'Construye cosas — de la pista de cobre a la red neuronal.', href: 'https://maykon.meneghel.me' },
    ],
  },
  values: {
    eyebrow: 'LO QUE QUEDA',
    title: 'Los valores que atravesaron',
    items: [
      { k: 'Trabajo', v: 'PLACEHOLDER — nadie te debe nada, y eso resulta liberador.' },
      { k: 'Palabra', v: 'PLACEHOLDER — el apretón de manos vale más que el contrato.' },
      { k: 'Mesa', v: 'PLACEHOLDER — la casa siempre está abierta, y siempre hay comida.' },
      { k: 'Estudio', v: 'PLACEHOLDER — lo que aprendes no te lo quita nadie.' },
    ],
  },
  doors: {
    eyebrow: 'LAS PUERTAS',
    title: 'Cada uno tiene la suya',
    lede: 'Esta casa tiene habitaciones. Entra en la que quieras.',
    soon: 'pronto',
  },
  footer: 'PLACEHOLDER — Hecho en casa, en {ciudad} — {estado}.',
};
