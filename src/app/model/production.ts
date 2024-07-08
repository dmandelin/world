import { Tile } from './tile';

export enum Produce {
    Barley,
    Lentils,
    Dairy,
}

export class ProduceInfo {
    constructor(readonly produce: Produce, readonly name: string) {}

    static Barley = new ProduceInfo(Produce.Barley, 'Barley');
    static Lentils = new ProduceInfo(Produce.Lentils, 'Lentils');
    static Dairy = new ProduceInfo(Produce.Dairy, 'Dairy');

    static all = [ProduceInfo.Barley, ProduceInfo.Lentils, ProduceInfo.Dairy];

    static get(p: Produce) {
        switch (p) {
            case Produce.Barley: return ProduceInfo.Barley;
            case Produce.Lentils: return ProduceInfo.Lentils;
            case Produce.Dairy: return ProduceInfo.Dairy;
            default: throw new Error('Invalid produce');
        }
    }

    static of(produceName: string) {
        switch (produceName) {
            case 'Barley': return ProduceInfo.Barley;
            case 'Lentils': return ProduceInfo.Lentils;
            case 'Dairy': return ProduceInfo.Dairy;
            default: throw new Error('Invalid produce');
        }
    }

    static getName(p: Produce) {
        return ProduceInfo.get(p).name;
    }
}

export class PerProduce {
    private m: Map<ProduceInfo, number>;

    constructor(m: Map<ProduceInfo, number> = new Map()) {
        this.m = m;
    }

    get(p: ProduceInfo): number {
        return this.m.get(p) || 0;
    }

    max(): [ProduceInfo, number] {
        return [...this.m.entries()].reduce((a, b) => a[1] > b[1] ? a : b);
    }

    incr(p: ProduceInfo, incr: number): void {
        this.m.set(p, this.get(p) + incr);
    }

    map(f: (p: ProduceInfo, v: number) => number): PerProduce {
        return new PerProduce(new Map([...this.m].map(([p, v]) => [p, f(p, v)])));
    }

    entries(): [ProduceInfo, number][] {
        return [...this.m.entries()];
    }
    
    static of(o: [string, number][] = []) {
        return new PerProduce(new Map(o.map(([k, v]) => [ProduceInfo.of(k), v])));
    }

    withIncr(p: ProduceInfo, incr: number): PerProduce {
        const m = new Map(this.m);
        m.set(p, this.get(p) + incr);
        return new PerProduce(m);
    }
}

export class Terrain {
    constructor(
        readonly name: 'Alluvium'|'DryLightSoil'|'Desert',
        readonly landUnitsPerTile: PerProduce,
    ) {}
}

export const Alluvium = new Terrain('Alluvium', PerProduce.of([
    ['Barley', 60000],
    ['Lentils', 30000],
    ['Dairy', 6000],
]));
export const DryLightSoil = new Terrain('DryLightSoil', PerProduce.of([
    ['Barley', 5000],
    ['Lentils', 10000],
    ['Dairy', 4000],
]));
export const Desert = new Terrain('Desert', PerProduce.of([
    ['Barley', 0],
    ['Lentils', 0],
    ['Dairy', 2500],
]));

export const AllTerrainTypes = [Alluvium, DryLightSoil, Desert];

export class Allocation {
    constructor(
        readonly tile: Tile,
        readonly product: ProduceInfo,
        readonly terrain: Terrain,
        readonly landFraction: number,
        readonly laborFraction: number) {}

    production(): number {
        const landUnits = this.landFraction * this.tile.areaFraction(this.terrain) * 
            (this.terrain.landUnitsPerTile.get(this.product) || 0);
        const laborUnits = this.laborFraction * this.tile.population;
        return this.ces_production(landUnits, laborUnits);
    }

    laborFractionIncr(incr: number): Allocation {
        return new Allocation(this.tile, this.product, this.terrain, this.landFraction, this.laborFraction + incr);
    }

    // CES production function.
    // - land is fractions of a tile.
    // - labor is total population of farming families working the best portions of that land.
    // - unitLand is the amount of land needed to produce one unit of output.
    // - unitLabor is the amount of labor needed to produce one unit of output.
    private ces_production(land: number, labor: number, unitLand: number = 1, unitLabor: number = 1): number {
        if (land === 0 || labor === 0) return 0;
        const landUnits = land / unitLand;
        const laborUnits = labor / unitLabor;
        return 1 / (0.6 / laborUnits + 0.4 / landUnits);
    }
}

export function replaceAlloc(allocs: readonly Allocation[], original: Allocation, replacement: Allocation) {
    const i = allocs.findIndex(a => a === original);
    if (i == -1) throw `Can't find alloc ${original} in ${allocs}`;
    return allocs.with(i, replacement);
}

export function reallocated(allocs: readonly Allocation[], from: Terrain, to: Terrain, peopleFraction: number): Allocation[]|undefined {
    const fromAlloc = allocs.find(a => a.terrain == from);
    const toAlloc = allocs.find(a => a.terrain == to);
    if (fromAlloc === undefined || toAlloc === undefined) return undefined;
    if (fromAlloc.laborFraction - peopleFraction < 0) return undefined;

    return allocs.map(a => {
        switch (a) {
            case fromAlloc: return a.laborFractionIncr(-peopleFraction);
            case toAlloc: return a.laborFractionIncr(peopleFraction);
            default: return a;
        }
    });
}

export type PerTerrainPerProduce = {
    Alluvium: PerProduce;
    DryLightSoil: PerProduce;
    Desert: PerProduce;
    Total: PerProduce;
}

export function production(allocs: readonly Allocation[]): PerTerrainPerProduce {
    const totals = {
        Alluvium: new PerProduce(),
        DryLightSoil: new PerProduce(),
        Desert: new PerProduce(),
        Total: new PerProduce(),
    };

    for (const alloc of allocs) {
        const p = alloc.production();
        totals[alloc.terrain.name].incr(alloc.product, p);
        totals.Total.incr(alloc.product, p);
    }

    return totals;
}

// For now, this is a Cobb-Douglas utility function with equal weights.
// - p is production
export function capacity(p: PerProduce) {
    const pdv = pastoralDietValue(p);
    const adv = agrarianDietValue(p);
    return Math.max(pdv, adv);
}

export function marginalCapacity(p: PerProduce): PerProduce {
    const e = 0.001;
    const c = capacity(p);
    return p.map((k, v) => (capacity(p.withIncr(k, e)) - c) / e);
}

function pastoralDietValue(p: PerProduce) {
    let plants = p.get(ProduceInfo.Barley) + p.get(ProduceInfo.Lentils);
    let animals = p.get(ProduceInfo.Dairy);
    if (plants < 0.2 * (plants + animals)) {
        const convert = 0.2 * (plants + animals) - plants;
        plants += convert / 2;
        animals -= convert;
    }
    return 2 * Math.pow(plants, 0.5) * Math.pow(animals, 0.5);
}

function agrarianDietValue(p: PerProduce) {
    let [c, l, a] = [p.get(ProduceInfo.Barley), p.get(ProduceInfo.Lentils), p.get(ProduceInfo.Dairy)];
    return 3 * Math.pow(c, 0.25) * Math.pow(l, 0.25), Math.pow(a, 0.5);
}
