package back.backend.domain.trip.dto;

import back.backend.domain.trip.entity.TripVisibility;
import java.util.List;

public record TripCompleteResponse(Long tripId, Long cardId, TripVisibility visibility, List<String> tags) {}
