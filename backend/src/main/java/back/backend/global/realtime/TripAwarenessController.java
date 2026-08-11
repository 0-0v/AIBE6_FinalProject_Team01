package back.backend.global.realtime;

import jakarta.validation.Valid;
import java.security.Principal;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Controller;

@Controller
public class TripAwarenessController {

    private final TripAwarenessService tripAwarenessService;

    public TripAwarenessController(TripAwarenessService tripAwarenessService) {
        this.tripAwarenessService = tripAwarenessService;
    }

    @MessageMapping("/trip-awareness/{tripId}")
    public void publish(
            @DestinationVariable Long tripId,
            @Valid @Payload TripAwarenessRequest request,
            Principal principal
    ) {
        tripAwarenessService.publish(tripId, request, principal);
    }
}
