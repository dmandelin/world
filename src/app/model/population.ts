import { TimeSeries } from "../data/timeseries";
import { Consumption } from "./consumption";
import { Priests } from "./polity";
import { Tile } from "./tile";

// - politics punchlist
// - immediate goal = differentiation
//   - pop groups with different names
//     x test this in app, see if has correct current list
//   - differential access to resources for the groups
///    - customary donations to eminent families
//   - differential welfare for the groups
//     x display groups with population and welfare (can initially be same)
//     - consumption pool for each pop group
//     - welfare computed off of their consumption pool
//     - population change separately
//     - happiness separately
// - next goal = opinion of each other
// - next next goal = special actions
export class Role {
    constructor(
        readonly name: string,
    ) {}
}

export const Roles = {
    ClansPeople: new Role('Clanspeople'),
    EminentFamilies: new Role('Eminent Families'),
    Priests: new Role('Priests'),
}

export class Pop {
    constructor(
        public n: number,
        readonly tile: Tile,
        readonly role: Role,
    ) {}

    readonly consumption = new Consumption(this);

    get capacityRatio(): number {
        return this.consumption.nutrition.value / this.n;
    }
}

export class Population {
    constructor(readonly tile: Tile, readonly pops: Pop[]) {}

    public n = this.pops.reduce((a, p) => a + p.n, 0);

    readonly baseDeathRate = 0.040;

    readonly censusSeries = new TimeSeries<Census>();
    private expectedDeathRate_ = 0;

    private lastNaturalIncrease: number = 0;
    private targetGrowthRate_: number = 0;

    get census(): Census {
        return this.censusSeries.lastValue;
    }

    get settlementsDescription(): string {
        return `${Math.round(this.n / this.tile.culture.baseSettlementSize)} ${this.tile.culture.baseSettlementName}`;
    }

    get capacityRatio(): number {
        return this.tile.capacity / this.tile.population;
    }

    get targetGrowthRate(): number {
        return this.targetGrowthRate_;
    }

    get expectedDeathRate(): number {
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
            this.targetGrowthRate_ = -decrease / this.n;
        } else {
            // Target overall growth rate for a population of this prosperity level.
            this.targetGrowthRate_ = (Math.min(capacityRatio, 2) - 0.7) / 0.3 * 0.014;

            const birthRate = (this.expectedDeathRate + this.targetGrowthRate_) * this.tile.mods.popGrowth.value;
            const growthRate = birthRate - this.baseDeathRate;
            this.lastNaturalIncrease = Math.floor(this.n * growthRate);
        }

        const delta = this.lastNaturalIncrease - raidingLosses;

        // Distribute the delta among pops and update the population.
        let deltaRemaining = delta;
        for (const pop of this.pops) {
            const deltaPop = Math.round(delta * pop.n / this.n);
            pop.n += deltaPop;
            deltaRemaining -= deltaPop;
        }
        this.pops[0].n += deltaRemaining;
        this.n = this.pops.reduce((a, p) => a + p.n, 0);
        
        // Update moving average expected death rate.
        const lastDeathRate = this.baseDeathRate + raidingLosses / originalPopulation;
        this.expectedDeathRate_ = (this.expectedDeathRate_ + lastDeathRate) / 2;
    }

    get complexity(): number {
        return 0.5 * Math.log10(this.n);
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