import { TimeSeries } from "../data/timeseries";
import { Consumption } from "./consumption";
import { Priests } from "./polity";
import { Tile } from "./tile";

// politics punchlist
// x differentiation
// x opinion of each other
// - artisans working for eminent families
//   - will need to get more resources for them
//     - have them work as other families at first
// - next goal = special actions
//   - first special action = build temple
//     - initial temples are small and might be built using family labor,
//       but perhaps donation system implies everyone will help
//     - would need "build temple" ideology to get whole population to help
//     - temple sponsors become priests
//     - increases power and benefit perception of priests,
//       so we'll need to have that have some effects

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

// The attitude of one population for another.
export class Attitude {
    constructor(
        readonly pop: Pop,
        readonly other: Pop,
        public powerPerception: number,
        public benefitPerception: number,
    ) {}
}

export class Pop {
    constructor(
        public n: number,
        readonly tile: Tile,
        readonly role: Role,
    ) {
        this.censusSeries.add(tile.world.year, new Census(tile.world.year, n, 0, 0));
    }

    readonly attitudes = new Map<Pop, Attitude>();

    readonly baseDeathRate = 0.040;

    readonly consumption = new Consumption(this);

    // Properties pertaining to the "memory" of this population and its practices.
    private targetGrowthRate_: number = 0;
    private expectedDeathRate_ = 0;

    readonly censusSeries = new TimeSeries<Census>();

    get capacityRatio(): number {
        return this.consumption.nutrition.value / this.n;
    }

    setTransfer(target: Pop, fraction: number): void {
        this.consumption.setTransfer(target.consumption, fraction);
    }

    initializeAttitudes(): void {
        for (const pop of this.tile.pop.pops) {
            if (pop === this) continue;
            this.attitudes.set(pop, new Attitude(this, pop, 0, 0));
        }
        this.updateAttitudes();
    }

    updateAttitudes(): void {
        for (const a of this.attitudes.values()) {
            if (a.other.role === Roles.EminentFamilies) {
                // Eminent families have genealogical and ritual seniority, making
                // them perceived as somewhat more powerful and beneficial, but not
                // greatly so from the base factors alone.
                a.powerPerception = 200;
                a.benefitPerception = 200;
            } else {
                // Eminent families initially consider themselves somewhat more
                // powerful, and perceive clanspeople as mutually beneficial.
                a.powerPerception = -200;
                a.benefitPerception = 200;
            }
        }
    }

    update(raidingDelta: number): void {
        const originalPopulation = this.n;
        const capacityRatio = this.capacityRatio;
        let naturalIncrease = 0;
        let targetGrowthRate = 0;
        if (capacityRatio < 0.5) {
            const targetCapacityRatio = 0.6 + Math.random() * 0.2;
            const targetPop = capacityRatio < 0.2 ? 0.1 + Math.random() * 0.4 : this.n * targetCapacityRatio / capacityRatio;
            const decrease = this.n - Math.floor(targetPop);
            // In a famine, raiding losses ease the burden somewhat, but are still net losses.
            naturalIncrease = -decrease + 0.5 * raidingDelta;
            targetGrowthRate = -decrease / this.n;
        } else {
            // Target overall growth rate for a population of this prosperity level.
            this.targetGrowthRate_ = (Math.min(capacityRatio, 2) - 0.7) / 0.3 * 0.014;

            const birthRate = (this.expectedDeathRate_ + this.targetGrowthRate_) * this.tile.mods.popGrowth.value;
            const growthRate = birthRate - this.baseDeathRate;
            naturalIncrease = Math.floor(this.n * growthRate);
        }

        let delta = naturalIncrease + raidingDelta;
        if (this.n + delta - 10 < 0) {
            const overage = -(this.n + delta - 10);
            raidingDelta += overage;
            delta += overage;
        }
        this.n += delta;
        
        // Update moving average expected death rate.
        const lastDeathRate = this.baseDeathRate - raidingDelta / originalPopulation;
        this.expectedDeathRate_ = (this.expectedDeathRate_ + lastDeathRate) / 2;

        // Update census.
        this.censusSeries.add(this.tile.world.year, new Census(
            this.tile.world.year,
            this.n, 
            naturalIncrease, 
            -raidingDelta));
    }
}

export class Population {
    constructor(readonly tile: Tile, readonly pops: Pop[]) {}

    public n = this.pops.reduce((a, p) => a + p.n, 0);

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

    update(): void {
        // Distribute raiding losses.
        const raidingDeltas = this.pops.map(
            p => Math.round(this.tile.raidEffects.deltaPopulation * p.n / this.n));

        for (const [i, pop] of this.pops.entries()) {
            pop.update(raidingDeltas[i]);
        }
        this.n = this.pops.reduce((a, p) => a + p.n, 0);
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