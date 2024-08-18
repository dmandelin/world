import { TimeSeries } from "../data/timeseries";
import { Tile } from "./tile";

export class Population {
    constructor(readonly tile: Tile, public n: number) {}

    readonly baseDeathRate = 0.040;

    readonly censusSeries = new TimeSeries<Census>();
    private expectedDeathRate_ = 0;

    private lastNaturalIncrease: number = 0;

    get census(): Census {
        return this.censusSeries.lastValue;
    }

    get capacityRatio(): number {
        return this.tile.capacity / this.tile.population;
    }

    private get expectedDeathRate(): number {
        if (this.expectedDeathRate_ === 0) {
            // Use actual current rate when there was no previous data.
            this.expectedDeathRate_ = this.baseDeathRate - this.tile.raidEffects.deltaPopulation / this.n;
        }
        return this.expectedDeathRate_;
    }

    update(): void {
        const originalPopulation = this.n;
        const raidingLosses = -this.tile.raidEffects.deltaPopulation;
        const capacityRatio = this.capacityRatio;
        if (capacityRatio < 0.5) {
            const targetCapacityRatio = 0.6 + Math.random() * 0.2;
            const decrease = this.n - Math.floor(this.n * targetCapacityRatio / capacityRatio);
            // In a famine, raiding losses ease the burden somewhat, but are still net losses.
            this.lastNaturalIncrease = -decrease + 0.5 * raidingLosses;
        } else {
            // Target overall growth rate for a population of this prosperity level.
            const targetGrowthRate = (Math.min(capacityRatio, 2) - 0.7) * 0.014;

            const birthRate = this.expectedDeathRate + targetGrowthRate;
            const growthRate = birthRate - this.baseDeathRate;
            this.lastNaturalIncrease = Math.floor(this.n * growthRate);
        }

        this.n += this.lastNaturalIncrease - raidingLosses;
        
        // Update moving average expected death rate.
        const lastDeathRate = this.baseDeathRate + raidingLosses / originalPopulation;
        this.expectedDeathRate_ = (this.expectedDeathRate_ + lastDeathRate) / 2;
    }

    updateTimeSeries(): void {
        this.censusSeries.add(this.tile.world.year, new Census(
            this.tile.world.year,
            this.n, 
            this.lastNaturalIncrease, 
            -this.tile.raidEffects.deltaPopulation));

        this.lastNaturalIncrease = 0;
    }
}

export class Census {
    constructor(
        readonly year: number,
        readonly n: number, 
        readonly naturalIncrease: number,
        readonly raidingLosses: number) {}

    get prev(): number { return this.n - this.change; }
    get change(): number { return this.naturalIncrease - this.raidingLosses; }
    get relativeChange(): number { return this.change / this.prev; }
}