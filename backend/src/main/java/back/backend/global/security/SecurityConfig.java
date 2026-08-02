package back.backend.global.security;

import back.backend.global.config.FrontendProperties;
import back.backend.global.security.jwt.JwtAuthenticationFilter;
import back.backend.global.security.oauth2.CustomOAuth2UserService;
import back.backend.global.security.oauth2.GoogleAccountSelectionAuthorizationRequestResolver;
import back.backend.global.security.oauth2.OAuth2TokenProperties;
import back.backend.global.security.oauth2.OAuth2LoginFailureHandler;
import back.backend.global.security.oauth2.OAuth2LoginSuccessHandler;
import java.util.List;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
@EnableMethodSecurity
@EnableConfigurationProperties({CorsProperties.class, FrontendProperties.class, OAuth2TokenProperties.class})
public class SecurityConfig {

    private static final String[] PUBLIC_PATHS = {
            "/error",
            "/favicon.ico",
            "/v3/api-docs/**",
            "/swagger-ui/**",
            "/swagger-ui.html",
            "/oauth2/**",
            "/login/oauth2/**",
            "/api/auth/reissue",
            "/api/auth/signup",
            "/api/auth/login",
            "/api/auth/nickname-availability",
            "/api/auth/email-verifications/**",
            "/api/auth/password-reset",
            "/ws/**",
            "/uploads/**"
    };

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(
            HttpSecurity http,
            JwtAuthenticationFilter jwtAuthenticationFilter,
            JwtAuthenticationEntryPoint jwtAuthenticationEntryPoint,
            JwtAccessDeniedHandler jwtAccessDeniedHandler,
            ObjectProvider<ClientRegistrationRepository> clientRegistrationRepositoryProvider,
            CustomOAuth2UserService customOAuth2UserService,
            OAuth2LoginSuccessHandler oAuth2LoginSuccessHandler,
            OAuth2LoginFailureHandler oAuth2LoginFailureHandler
    ) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .cors(Customizer.withDefaults())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .formLogin(form -> form.disable())
                .httpBasic(basic -> basic.disable())
                .exceptionHandling(exception -> exception
                        .authenticationEntryPoint(jwtAuthenticationEntryPoint)
                        .accessDeniedHandler(jwtAccessDeniedHandler))
                .authorizeHttpRequests(authorize -> authorize
                        .requestMatchers(PUBLIC_PATHS).permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/trip-invitations/*/preview").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/trip-invitations/*/accept").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/guest/trips/*").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/trips/*/places/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/trips/*/categories").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/trips/*/itinerary").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/trips/*/expenses/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/trips/*/activity-logs").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/trips/*/travel-records").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/trips/*/members").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/places/search").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/places/photo").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/places/photo/metadata").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/cards/public").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/cards/*/detail").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/cards/*/comments").permitAll()
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .anyRequest().authenticated())
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        ClientRegistrationRepository clientRegistrationRepository =
                clientRegistrationRepositoryProvider.getIfAvailable();
        if (clientRegistrationRepository != null) {
            GoogleAccountSelectionAuthorizationRequestResolver authorizationRequestResolver =
                    new GoogleAccountSelectionAuthorizationRequestResolver(clientRegistrationRepository);
            http.oauth2Login(oauth2 -> oauth2
                    .authorizationEndpoint(endpoint -> endpoint
                            .authorizationRequestResolver(authorizationRequestResolver))
                    .userInfoEndpoint(userInfo -> userInfo.userService(customOAuth2UserService))
                    .successHandler(oAuth2LoginSuccessHandler)
                    .failureHandler(oAuth2LoginFailureHandler));
        }

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource(CorsProperties properties) {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(properties.getAllowedOrigins());
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("Authorization", "Content-Type", "Accept", "Origin"));
        configuration.setExposedHeaders(List.of("Authorization", "Location"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
