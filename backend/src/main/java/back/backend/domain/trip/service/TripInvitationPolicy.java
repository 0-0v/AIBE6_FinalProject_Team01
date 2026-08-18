package back.backend.domain.trip.service;

import back.backend.domain.trip.entity.Trip;
import back.backend.domain.trip.entity.TripStatus;
import back.backend.domain.trip.exception.TripErrorCode;
import back.backend.global.exception.BusinessException;

final class TripInvitationPolicy {

    private TripInvitationPolicy() {
    }

    static Trip requireOpen(Trip trip) {
        if (trip.getStatus() == TripStatus.COMPLETED || trip.getStatus() == TripStatus.CANCELLED) {
            throw new BusinessException(TripErrorCode.TRIP_ALREADY_FINISHED);
        }
        return trip;
    }
}
