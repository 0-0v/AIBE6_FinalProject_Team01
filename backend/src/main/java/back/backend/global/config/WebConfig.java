package back.backend.global.config;

import back.backend.domain.place.service.TripAccessChecker;
import back.backend.domain.trip.repository.TripRepository;
import back.backend.global.security.CompletedTripWriteInterceptor;
import back.backend.global.security.TripReadAccessInterceptor;
import java.nio.file.Path;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
@EnableConfigurationProperties(FileStorageProperties.class)
public class WebConfig implements WebMvcConfigurer {

    private final FileStorageProperties fileStorageProperties;
    private final TripAccessChecker tripAccessChecker;
    private final TripRepository tripRepository;

    public WebConfig(
            FileStorageProperties fileStorageProperties,
            ObjectProvider<TripAccessChecker> tripAccessCheckerProvider,
            ObjectProvider<TripRepository> tripRepositoryProvider
    ) {
        this.fileStorageProperties = fileStorageProperties;
        this.tripAccessChecker = tripAccessCheckerProvider.getIfAvailable();
        this.tripRepository = tripRepositoryProvider.getIfAvailable();
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        if (tripAccessChecker != null) {
            registry.addInterceptor(new TripReadAccessInterceptor(tripAccessChecker))
                    .addPathPatterns("/api/trips/{tripId}/**");
        }
        if (tripRepository != null) {
            registry.addInterceptor(new CompletedTripWriteInterceptor(tripRepository))
                    .addPathPatterns("/api/trips/{tripId}/**");
        }
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        String location = Path.of(fileStorageProperties.getUploadDir())
                .toAbsolutePath()
                .toUri()
                .toString();

        registry.addResourceHandler("/uploads/**")
                .addResourceLocations(location);
    }
}
