import { canDo, type TripAction, type TripDetail } from '@7trip/shared';

/** Whether this device is in the trip as a guest (no account). */
export const amGuest = (trip: TripDetail) => trip.participants.some((p) => p.isMe && p.isGuest);

/** canDo() for the current viewer of a trip. */
export const can = (action: TripAction, trip: TripDetail) => canDo(action, trip.myRole, trip, amGuest(trip));
