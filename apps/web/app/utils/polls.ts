import { formatDayMonth, localIsoDate, weekdayShort, type Poll } from '@7trip/shared';

/** "dim. 26 oct.", like in the app. */
export const deadlineLabel = (closesAt: string) => {
  const day = localIsoDate(new Date(closesAt));
  return `${weekdayShort(day)}. ${formatDayMonth(day)}`;
};

export const pollStatus = (poll: Poll) => (poll.closed ? 'Clos' : poll.hasVoted ? 'Tu as voté' : 'À voter');
