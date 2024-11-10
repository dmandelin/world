import { TimeSeries } from "../data/timeseries";
import { Consumption2 as Consumption2 } from "./consumption";
import { Consumption } from "./consumption3";
import { argmax, clamp } from "./lib";
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

// New Population Change Model
//
// The new model is intended to approximate logistic growth toward the
// effective carrying capacity of the region, but with birth and death
// rates depending on average consumption rather than population. The
// reason is that we don't think people modify childbearing based on
// local population per se (which they probably don't even know), but
// rather on the ease of setting up a family. Similarly, death rates
// will depend more on nutrition than population size.
//
// Key features of the new model:
// - At carrying capacity, average birth and death rates are about equal,
//   30 per 1000 per year.
// - We assume that populations tend to modulate births to maintain a
//   standard of living, but with some tendency to overshoot. We could
//   actually start with carrying capacity corresponding to average
//   nutrition 100%, but more realistically it's probably 2/3-3/4. 
// - Population growth moves away from the baseline of 0 at carrying
//   capacity by log2(productivity/baseline) * base growth rate (0.005),
//   to a max of base growth rate (r).
// - At very low productivity, we may want to set a higher population
//   loss rate.
// - For now, we'll assume that most of the population change difference
//   is due to birth rate changes, and the rest death rate changes.
// - Death rates from prehistoric raiding should be around 3 per 1000.
// - If we split out epidemic diseases, they might average 1-5 per 1000
//   (thus perhaps 5-40% of causes of death are disease, which seems
//   reasonable).


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
        this.censusSeries.add(tile.world.year, new BasicCensus(tile.world.year, n, 0, 0, 0, 0, 0, 0));
    }

    readonly attitudes = new Map<Pop, Attitude>();

    readonly baseDeathRate = 0.027;
    readonly baseBirthRate = 0.03;
    readonly maxGrowthRate = 0.005;

    readonly consumption2 = new Consumption2(this);
    readonly consumption = new Consumption(this);

    readonly censusSeries = new TimeSeries<BasicCensus>();

    get workers(): number {
        return Math.ceil(0.2 * this.n);
    }

    get capacityRatio(): number {
        return this.consumption.nutrition.value / this.n;
    }

    setTransfer(target: Pop, fraction: number): void {
        this.consumption2.setTransfer(target.consumption2, fraction);
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
        
        // Calculate birth and death rates.
        const capacityRatio = this.capacityRatio;
        const popChangeFactor = capacityRatio > 0
            ? clamp(Math.log2(capacityRatio / 0.7), -1, 1)
            : -1;
        const popChangeRate = popChangeFactor * this.maxGrowthRate;
        const birthRate = this.baseBirthRate + popChangeRate * 0.75;
        const naturalDeathRate = this.baseDeathRate - popChangeRate * 0.25;

        // Play out rates.
        let newN = this.n;
        for (let i = 0; i < this.tile.world.yearsPerTurn; i++) {
            const births = Math.round(newN * birthRate);
            const deaths = Math.round(newN * naturalDeathRate) - raidingDelta / this.tile.world.yearsPerTurn;
            newN += births - deaths;
        }
        newN = Math.floor(Math.max(newN, 0));

        // Update population.
        const delta = newN - this.n;
        this.n = newN;

        // Update census.
        this.censusSeries.add(this.tile.world.year, new BasicCensus(
            this.tile.world.year,
            this.n,
            delta,
            birthRate,
            naturalDeathRate,
            -raidingDelta / this.n / this.tile.world.yearsPerTurn,
            this.n - originalPopulation - raidingDelta, 
            -raidingDelta));
    }
}

export class Settlement {
    constructor(
        readonly tile: Tile,
        public n: number,
    ) {}

    readonly typeName = this.tile.isRiver ? 'villages' : 'camps';
}

export class Population {
    constructor(readonly tile: Tile, readonly pops: Pop[]) {
        // Initial population distribution: Generate an approximate
        // number of settlements, then distribute the population among them.
        const settlementCount = Math.max(1, Math.round(this.n / (this.minSettlementSize * 1.5)));
        const settlementWeights = new Array(settlementCount).fill(0)
            .map(() => (1 + Math.random() * 1.414) * (1 + Math.random() * 1.414));
        const totalWeight = settlementWeights.reduce((a, b) => a + b, 0);
        const settlementSizes = settlementWeights.map(w => Math.round(this.n * w / totalWeight));
        // This should be almost right, so if we arbitrarily correct the
        // last size to get the total, distribution should still be fine.
        settlementSizes[settlementSizes.length - 1] = 
            this.n - settlementSizes.slice(0, -1).reduce((a, b) => a + b, 0);
        // Set the property.
        this.settlements = settlementSizes.map(n => new Settlement(this.tile, n));
        this.settlements.sort((a, b) => b.n - a.n);
    }

    public minSettlementSize = this.tile.isRiver ? 200 : 20;

    public n = this.pops.reduce((a, p) => a + p.n, 0);
    readonly settlements: Settlement[];

    readonly censusSeries = new TimeSeries<TerritoryCensus>();
    private expectedDeathRate_ = 0;

    private lastNaturalIncrease: number = 0;
    private targetGrowthRate_: number = 0;

    get workers(): number {
        return this.pops.reduce((a, p) => a + p.workers, 0);
    }

    get census(): TerritoryCensus {
        return this.censusSeries.lastValue;
    }

    get settlementsDescription(): string {
        return `${this.settlements.length} ${this.settlements[0].typeName}: ${this.settlements.map(s => s.n).join(', ')}`;
    }

    get capacityRatio(): number {
        return this.tile.capacity / this.tile.population;
    }

    update(): void {
        // Distribute raiding losses.
        const raidingDeltas = this.pops.map(
            p => Math.round(this.tile.raids.deltaPopulation * p.n / this.n));

        // Update pops.
        for (const [i, pop] of this.pops.entries()) {
            pop.update(raidingDeltas[i]);
        }

        // Update tile totals.
        const originalN = this.n;
        this.n = this.pops.reduce((a, p) => a + p.n, 0);
        const delta = this.n - originalN;
        this.lastNaturalIncrease = this.pops.reduce((a, p) => a + p.censusSeries.lastValue.naturalIncrease, 0);

        // Distribute changes among the settlements proportionally to their size,
        // but with some random jitter.
        const settlementWeights = this.settlements
            .map(s => Math.min(s.n / this.tile.pop.minSettlementSize, 1) - 0.5 + Math.random());
        const totalWeight = settlementWeights.reduce((a, b) => a + b, 0);
        const settlementDeltas = settlementWeights.map(w => Math.round(delta * w / totalWeight));
        // This should be almost right, so if we arbitrarily correct the last delta to get the total,
        // we should do OK.
        settlementDeltas[settlementDeltas.length - 1] = 
            delta - settlementDeltas.slice(0, -1).reduce((a, b) => a + b, 0);
        // Update the settlements.
        for (const [i, s] of this.settlements.entries()) {
            s.n += settlementDeltas[i];
        }

        // Once a settlement generates enough disamenities of scale, it will split.
        const originalSettlements = [...this.settlements];
        for (const s of originalSettlements) {
            const appeal = 1 / Math.pow(s.n / this.tile.pop.minSettlementSize, 1.15);
            // if appeal is low, have a probability of splitting based on how far off it is.
            if (appeal < 0.5 && Math.random() < (0.5 - appeal)) {
                // Split off approximately 1/3 of the settlement.
                const newSettlement = new Settlement(
                    this.tile, Math.round(s.n * (0.2 + Math.random() * 0.2)));
                s.n -= newSettlement.n;
                this.settlements.push(newSettlement);
            }
        }
    }

    get complexity(): number {
        return 0.5 * Math.log10(this.n);
    }

    updateTimeSeries(): void {
        this.censusSeries.add(this.tile.world.year, new TerritoryCensus(
            this.tile.world.year,
            this.n,
            0,
            0,
            0,
            this.lastNaturalIncrease, 
            -this.tile.raids.deltaPopulation,
            this.settlements));

        this.lastNaturalIncrease = 0;
    }
}

export class BasicCensus {
    constructor(
        readonly year: number,
        readonly n: number,
        readonly change: number,
        readonly birthRate: number,
        readonly naturalDeathRate: number,
        readonly raidingDeathRate: number,
        readonly naturalIncrease: number,
        readonly raidingLosses: number) {
    }

    get prev(): number { return this.n - this.change; }
    get relativeChange(): number { return this.change / this.prev; }

    get deathRate(): number { return this.naturalDeathRate + this.raidingDeathRate; }
}

export class TerritoryCensus extends BasicCensus {
    constructor(
        year: number,
        n: number,
        change: number,
        birthRate: number,
        naturalDeathRate: number,
        naturalIncrease: number,
        raidingLosses: number,
        settlements: readonly Settlement[]) {
        super(year, n, change, birthRate, naturalDeathRate, 0, naturalIncrease, raidingLosses);
        this.settlementCount = settlements.length;
        this.largestSettlementSize = argmax(settlements, s => s.n)[1];
        }

    readonly settlementCount: number;
    readonly largestSettlementSize: number;
}