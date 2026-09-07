/**
 * schema.org for the page.
 *
 * A person reads the chapters. A screening model reads this: it is the only
 * place on the site where the skills, the degrees, the employers, the papers
 * and the profiles are stated as data rather than as prose. Everything in here
 * is already visible on the page — this restates it in a form a machine does
 * not have to infer from "It starts with a single pin".
 */
import { careerItems, publications, ventures, allSkills } from '../content/career';
import type { Content, Locale } from '../content';

export const PROFILES = [
  'https://www.linkedin.com/in/maykonmeneghel/',
  'https://github.com/maykonmeneghel',
] as const;

/** The grouped list plus everything the chapters credit, de-duplicated. */
export function skillsFrom(c: Content): string[] {
  return [...new Set([...allSkills, ...c.chapters.flatMap((ch) => ch.stack)])];
}

export function personJsonLd(c: Content, locale: Locale, site: string, url: string) {
  const open = careerItems.filter((i) => i.end === null);
  const person = {
    '@type': 'Person',
    '@id': `${site}/#maykon`,
    name: 'Maykon Meneghel',
    givenName: 'Maykon',
    familyName: 'Meneghel',
    jobTitle: c.hero.kicker.split('·')[0].trim(),
    description: c.meta.description,
    url: site + '/',
    email: 'mailto:maykonmeneghel@icloud.com',
    sameAs: [...PROFILES],
    knowsAbout: skillsFrom(c),
    knowsLanguage: ['pt-BR', 'en', 'es'],
    address: { '@type': 'PostalAddress', addressLocality: 'Curitiba', addressRegion: 'PR', addressCountry: 'BR' },
    alumniOf: [
      { '@type': 'CollegeOrUniversity', name: 'Pontifícia Universidade Católica do Paraná (PUC-PR)' },
      { '@type': 'EducationalOrganization', name: 'Apple Developer Academy' },
    ],
    hasCredential: [
      { '@type': 'EducationalOccupationalCredential', credentialCategory: "Master's degree", educationalLevel: 'M.Sc.', name: 'M.Sc. Bioengineering' },
      { '@type': 'EducationalOccupationalCredential', credentialCategory: 'Postgraduate specialization', name: 'Applied Artificial Intelligence' },
      { '@type': 'EducationalOccupationalCredential', credentialCategory: 'Postgraduate specialization', name: 'iOS Development' },
      { '@type': 'EducationalOccupationalCredential', credentialCategory: 'Bachelor degree', name: 'B.Eng. Control & Automation Engineering' },
    ],
    // Only roles with no end date, so the profile never claims a job he left.
    worksFor: open.map((i) => ({ '@type': 'Organization', name: i.org })),
    founder: ventures.map((v) => ({ '@type': 'Organization', name: v.name })),
  };

  const app = {
    '@type': 'SoftwareApplication',
    name: 'Tradx',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'macOS, Windows',
    url: 'https://apps.apple.com/us/app/tradx/id6743033919',
    author: { '@id': `${site}/#maykon` },
  };

  const works = publications.map((p) => ({
    '@type': 'ScholarlyArticle',
    headline: c.record.publications.items[p.id],
    datePublished: String(p.year),
    publisher: { '@type': 'Organization', name: p.venue },
    author: { '@id': `${site}/#maykon` },
    ...(p.doi ? { identifier: `https://doi.org/${p.doi}` } : {}),
    ...(p.url ? { url: p.url } : {}),
  }));

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'ProfilePage',
        '@id': url,
        url,
        name: c.meta.title,
        description: c.meta.description,
        inLanguage: locale === 'pt' ? 'pt-BR' : locale,
        mainEntity: { '@id': `${site}/#maykon` },
      },
      person,
      app,
      ...works,
    ],
  };
}
