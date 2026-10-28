import { createPollRequestSchema, isPollClosed, pollFollowUp, pollFollowUpLabel, pollLeaders, votePollRequestSchema } from './polls.js';

const options = (...labels: string[]) => labels.map((label) => ({ label }));

describe('createPollRequestSchema', () => {
  it('needs a question and two options; single choice by default', () => {
    const parsed = createPollRequestSchema.parse({ question: ' Où part-on ? ', options: options('Split', 'Naxos') });
    expect(parsed).toMatchObject({ question: 'Où part-on ?', kind: 'OTHER', multiple: false });
    expect(createPollRequestSchema.safeParse({ question: 'Où ?', options: options('Split') }).success).toBe(false);
    expect(createPollRequestSchema.safeParse({ question: '', options: options('Split', 'Naxos') }).success).toBe(false);
  });

  it('refuses the same option twice', () => {
    const result = createPollRequestSchema.safeParse({ question: 'Où ?', options: options('Split', ' split ') });
    expect(result.error?.issues[0]?.path).toEqual(['options', 1, 'label']);
  });

  it('needs dates on each option of a DATES poll, in order', () => {
    expect(createPollRequestSchema.safeParse({ kind: 'DATES', question: 'Quand ?', options: options('Juillet', 'Août') }).success).toBe(false);
    const dates = (startDate: string, endDate: string) => ({ label: startDate, startDate, endDate });
    expect(
      createPollRequestSchema.safeParse({ kind: 'DATES', question: 'Quand ?', options: [dates('2027-07-01', '2027-07-08'), dates('2027-08-01', '2027-08-08')] })
        .success,
    ).toBe(true);
    expect(
      createPollRequestSchema.safeParse({ kind: 'DATES', question: 'Quand ?', options: [dates('2027-07-08', '2027-07-01'), dates('2027-08-01', '2027-08-08')] })
        .success,
    ).toBe(false);
  });
});

describe('votePollRequestSchema', () => {
  it('accepts an empty vote, to withdraw it', () => {
    expect(votePollRequestSchema.parse({ optionIds: [] })).toEqual({ optionIds: [] });
  });
});

describe('isPollClosed', () => {
  const now = new Date('2026-10-28T12:00:00Z');
  it('is closed by hand or once past its deadline', () => {
    expect(isPollClosed({ closedAt: null, closesAt: null }, now)).toBe(false);
    expect(isPollClosed({ closedAt: null, closesAt: '2026-10-28T13:00:00Z' }, now)).toBe(false);
    expect(isPollClosed({ closedAt: null, closesAt: '2026-10-28T11:00:00Z' }, now)).toBe(true);
    expect(isPollClosed({ closedAt: '2026-10-27T10:00:00Z', closesAt: null }, now)).toBe(true);
  });
});

describe('pollLeaders', () => {
  it('returns every option on a tie, none before any vote', () => {
    expect(pollLeaders([{ votes: 0 }, { votes: 0 }])).toEqual([]);
    expect(pollLeaders([{ votes: 2 }, { votes: 3 }, { votes: 3 }])).toHaveLength(2);
    expect(pollLeaders([{ votes: null }])).toEqual([]);
  });
});

describe('pollFollowUp', () => {
  it('depends on the kind and on what the option carries', () => {
    expect(pollFollowUp('DESTINATION', { startDate: null, ideaId: null })).toBe('destination');
    expect(pollFollowUp('DATES', { startDate: '2027-07-01', ideaId: null })).toBe('dates');
    expect(pollFollowUp('ACTIVITY', { startDate: null, ideaId: 'x' })).toBe('keepIdea');
    expect(pollFollowUp('ACTIVITY', { startDate: null, ideaId: null })).toBeNull();
    expect(pollFollowUp('YES_NO', { startDate: null, ideaId: null })).toBeNull();
  });

  it('names the action', () => {
    expect(pollFollowUpLabel('destination', { label: 'Split', startDate: null, endDate: null }, '2026-10-28')).toBe('Définir Split comme destination');
    expect(pollFollowUpLabel('dates', { label: '', startDate: '2027-07-12', endDate: '2027-07-19' }, '2026-10-28')).toBe('Fixer les dates : 12 – 19 juillet 2027');
  });
});
