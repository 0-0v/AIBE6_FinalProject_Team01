package back.backend.domain.trip.entity;

public enum TravelPace {
    FAST(0.7),
    NORMAL(1.0),
    RELAXED(1.5);

    private final double stayMultiplier;

    TravelPace(double stayMultiplier) {
        this.stayMultiplier = stayMultiplier;
    }

    public double stayMultiplier() {
        return stayMultiplier;
    }
}
