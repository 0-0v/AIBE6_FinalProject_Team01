package back.backend.domain.place.controller;

import back.backend.domain.place.dto.response.PlaceVoteNotificationResponse;
import back.backend.domain.place.service.PlaceVoteService;
import back.backend.global.response.ApiResponse;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/notifications/place-votes")
@RequiredArgsConstructor
public class PlaceVoteNotificationController {

    private final PlaceVoteService placeVoteService;

    @GetMapping
    public ApiResponse<List<PlaceVoteNotificationResponse>> getNotifications() {
        return ApiResponse.success(placeVoteService.getNotifications());
    }

    @PatchMapping("/{notificationId}/read")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void markRead(@PathVariable Long notificationId) {
        placeVoteService.markNotificationRead(notificationId);
    }
}
