import { OpeningBook, FAMOUS_OPENINGS } from './opening-book';

describe('OpeningBook', () => {
  let book: OpeningBook;

  beforeEach(() => {
    book = new OpeningBook();
  });

  it('returns an initial-position book move for white before any moves are played', () => {
    const move = book.getBookMove('white', 1);
    expect(move).not.toBeNull();
    expect(move!.frequency).toBeGreaterThan(0);
  });

  it('returns null once past the max book depth', () => {
    expect(book.getBookMove('white', 9)).toBeNull();
  });

  it('reset clears recorded move history', () => {
    book.recordMove({ row: 6, col: 1 }, { row: 5, col: 2 });
    book.reset();
    // With no history, black should fall back to the 'initial' book.
    expect(book.getBookMove('black', 1)).not.toBeNull();
  });

  describe('getOpeningName', () => {
    it('returns null before two moves have been recorded', () => {
      book.recordMove({ row: 6, col: 1 }, { row: 5, col: 2 });
      expect(book.getOpeningName()).toBeNull();
    });

    it('recognizes a famous opening line by its exact move sequence', () => {
      const roozenburg = FAMOUS_OPENINGS.find((o) => o.name === 'Roozenburg')!;
      for (const move of roozenburg.moves) {
        book.recordMove(move.from, move.to);
      }
      expect(book.getOpeningName()).toBe('Roozenburg');
    });

    it('returns null when the sequence matches no known opening', () => {
      book.recordMove({ row: 9, col: 9 }, { row: 8, col: 8 });
      book.recordMove({ row: 0, col: 0 }, { row: 1, col: 1 });
      expect(book.getOpeningName()).toBeNull();
    });
  });
});
