/**
 * Bebel's age is computed at build time rather than written into the copy, so
 * the page does not quietly become wrong on her next birthday.
 *
 * Confirmed by Maykon: Yorkshire Terrier, 10 years old in September 2026.
 * The birth *month* is unconfirmed, so the year below is inferred; if she was
 * born late in 2016 this will read one year high for part of each year.
 */
export const bebel = {
  breed: 'Yorkshire Terrier',
  bornYear: 2016,
};

export const ageOf = (bornYear: number) => new Date().getFullYear() - bornYear;
