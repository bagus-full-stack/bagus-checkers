import { getVariantById, INTERNATIONAL_DRAUGHTS, ENGLISH_DRAUGHTS } from './game-variant.model';

describe('game-variant.model', () => {
  it('finds a variant by id', () => {
    expect(getVariantById('english')).toBe(ENGLISH_DRAUGHTS);
  });

  it('falls back to international draughts for an unknown id', () => {
    expect(getVariantById('unknown')).toBe(INTERNATIONAL_DRAUGHTS);
  });
});
