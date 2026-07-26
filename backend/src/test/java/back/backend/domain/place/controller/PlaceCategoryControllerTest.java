package back.backend.domain.place.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
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
import org.springframework.http.MediaType;
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
                3L, "음식점", PlaceCategoryType.FOOD, "#dc2626", PlaceMarkerIcon.UTENSILS, 0);
    }

    @Test
    @DisplayName("t1 여행방 카테고리 목록을 반환한다")
    void t1_getCategoriesReturnsList() throws Exception {
        given(categoryService.getCategories(1L)).willReturn(List.of(category));

        mockMvc.perform(get("/api/trips/1/categories"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].name").value("음식점"));
    }

    @Test
    @DisplayName("t2 유효한 사용자 카테고리를 생성하면 201을 반환한다")
    void t2_createCategoryReturnsCreated() throws Exception {
        given(categoryService.create(any(), any())).willReturn(category);

        mockMvc.perform(post("/api/trips/1/categories")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"야경","markerColor":"#112233","markerIcon":"STAR"}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.categoryId").value(3));
    }

    @Test
    @DisplayName("t3 마커 색상 형식이 잘못되면 400을 반환한다")
    void t3_invalidMarkerColorReturnsBadRequest() throws Exception {
        mockMvc.perform(post("/api/trips/1/categories")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"야경","markerColor":"red","markerIcon":"STAR"}
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("t4 카테고리를 수정하면 변경된 정보를 반환한다")
    void t4_updateCategoryReturnsUpdatedCategory() throws Exception {
        given(categoryService.update(any(), any(), any())).willReturn(category);

        mockMvc.perform(put("/api/trips/1/categories/3")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"음식점","markerColor":"#dc2626","markerIcon":"UTENSILS"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.name").value("음식점"));
    }

    @Test
    @DisplayName("t5 카테고리를 삭제하면 204를 반환한다")
    void t5_deleteCategoryReturnsNoContent() throws Exception {
        mockMvc.perform(delete("/api/trips/1/categories/3"))
                .andExpect(status().isNoContent());
    }

    @Test
    @DisplayName("t6 전체 카테고리 ID로 정렬 순서를 변경한다")
    void t6_reorderCategoriesReturnsOrderedList() throws Exception {
        given(categoryService.reorder(any(), any())).willReturn(List.of(category));

        mockMvc.perform(put("/api/trips/1/categories/order")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"categoryIds\":[3]}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].categoryId").value(3));
    }

    @Test
    @DisplayName("t7 허용되지 않은 마커 아이콘 키는 400을 반환한다")
    void t7_invalidMarkerIconReturnsBadRequest() throws Exception {
        mockMvc.perform(post("/api/trips/1/categories")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"위험","markerColor":"#112233","markerIcon":"<svg>"}
                                """))
                .andExpect(status().isBadRequest());
    }
}
