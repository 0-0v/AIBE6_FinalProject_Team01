package back.backend.domain.place.controller;

import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import back.backend.domain.place.dto.response.PlaceCategoryResponse;
import back.backend.domain.place.entity.PlaceCategoryType;
import back.backend.domain.place.entity.PlaceMarkerIcon;
import back.backend.domain.place.service.PlaceCategoryService;
import back.backend.global.exception.GlobalExceptionHandler;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

@ExtendWith(MockitoExtension.class)
class PlaceCategoryControllerTest {

    @Mock PlaceCategoryService categoryService;
    private MockMvc mockMvc;
    private PlaceCategoryResponse category;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
                .standaloneSetup(new PlaceCategoryController(categoryService))
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
        category = new PlaceCategoryResponse(
                3L, "음식점", PlaceCategoryType.FOOD, "#dc2626", PlaceMarkerIcon.UTENSILS);
    }

    @Test
    @DisplayName("t1 여행방 카테고리 목록을 반환한다")
    void t1_getCategoriesReturnsList() throws Exception {
        given(categoryService.getCategories(1L)).willReturn(List.of(category));

        mockMvc.perform(get("/api/trips/1/categories"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].name").value("음식점"));
    }
}
