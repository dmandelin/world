import { WorldLog } from "./world";

export type Bonuses = {
    populationGrowthFactor?: number,

    hopeFactor?: number,
    gritFactor?: number,
    prosperityFactor?: number,

    peopleFreedomFactor?: number,
    leisureValue?: number,

    agrarianOutputFactor?: number,
    pastoralOutputFactor?: number,
    transactionCostFactor?: number,
    raidIntensity?: number,
    raidCapture?: number,
    raidMobility?: number,
}

export type BonusKey = keyof Bonuses;

export class ReligiousTrait {
    constructor(
        readonly name: string,
        readonly bonuses: Bonuses) {
    }
}

class ReligiousTraitsSingleton {
    readonly Fertility = new ReligiousTrait('Fertility', {
        populationGrowthFactor: 1.2,
        hopeFactor: 0.8,
        gritFactor: 1.1,
        prosperityFactor: 0.15,
    });
    readonly Agrarian = new ReligiousTrait('Agrarian', {
        agrarianOutputFactor: 1.1,
        hopeFactor: 0.6,
        gritFactor: 1.1,
        prosperityFactor: 0.2,
    });
    readonly Pastoral = new ReligiousTrait('Pastoral', {
        pastoralOutputFactor: 1.1,
        hopeFactor: 0.9,
        gritFactor: 1.2,
        prosperityFactor: 0.1,
    });
    readonly Trading = new ReligiousTrait('Trading', {
        transactionCostFactor: 0.7,
        hopeFactor: 0.9,
        prosperityFactor: 0.3,
    });
    readonly Peace = new ReligiousTrait('Peace', {
        agrarianOutputFactor: 1.1,
        pastoralOutputFactor: 1.05,
        transactionCostFactor: 0.9,
        hopeFactor: 0.8,
        gritFactor: 1.1,
        prosperityFactor: 0.2,
    });
    readonly War = new ReligiousTrait('War', {
        raidIntensity: 1.5,
        raidCapture: 1.2,
        agrarianOutputFactor: 0.9,
        pastoralOutputFactor: 0.95,
        transactionCostFactor: 1.1,
        prosperityFactor: 0.1,
    });
}

export const ReligiousTraits = new ReligiousTraitsSingleton();

class TempleLevel {
    constructor(
        readonly name: string,
        readonly complexity: number,
        readonly level: number,
        readonly cost: number, 
        readonly capacity: number) {
    }
}

export const TempleLevels = [
    new TempleLevel('Shrines', 1, 0, 0, 500),
    new TempleLevel('Temple I', 1.8, 1, 100, 1000),
    new TempleLevel('Temple II', 2.4, 2, 300, 2000),
    new TempleLevel('Temple III', 3.2, 3, 1000, 5000),
    new TempleLevel('Temple IV', 4, 4, 3000, 10000),
]

export class ReligiousSite {
    constructor(readonly traits: ReligiousTrait[]) {
    }

    get name(): string { throw new Error('abstract method'); }
    get capacity(): number { throw new Error('abstract method'); }
    get complexity(): number { throw new Error('abstract method'); }
    
    bonus(b: BonusKey, population: number) {
        if (this.traits.length > 1) throw new Error('not implemented: multiple trait bonuses');
        const baseBonusMinusOne = (this.traits[0].bonuses[b] ?? 1) - 1;
        const capacityFactor = Math.min(1, this.capacity / population);
        return 1 + baseBonusMinusOne * capacityFactor;
    }
}

export class HolySite extends ReligiousSite {
    override get name() { return 'Holy Mountain'; }
    override get capacity() { return 500; }
    override get complexity() { return 1; }
}

export class Temple extends ReligiousSite {
    private level_ = 0;
    private construction_ = 0;

    private get l() { return TempleLevels[this.level_]; }
    override get name() { return this.l.name; }
    override get capacity() { return this.l.capacity; }
    override get complexity() { return this.l.complexity; }

    get construction() { return this.construction_; }
    get nextLevel() { return TempleLevels[this.level_ + 1]; }

    applyConstruction(construction: number): boolean {
        if (this.level_ == TempleLevels.length - 1) {
            return false;
        }
        const nextLevel = TempleLevels[this.level_ + 1];

        this.construction_ += construction;
        if (this.construction_ >= nextLevel.cost) {
            ++this.level_;
            this.construction_ -= nextLevel.cost;
            if (this.level_ == TempleLevels.length - 1) {
                this.construction_ = 0;
            }
            return true;
        }
        return false;
    }
}