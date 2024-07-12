import { Tile } from './tile';

export class Product {
    constructor(
        readonly name: 'Barley'|'Lentils'|'Dairy',
    ) {}

    static fromName(name: string): Product {
        switch (name) {
            case 'Barley': return Barley;
            case 'Lentils': return Lentils;
            case 'Dairy': return Dairy;
            default: throw `Unknown product ${name}`;
        }
    }
}

export const Barley = new Product('Barley');
export const Lentils = new Product('Lentils');
export const Dairy = new Product('Dairy');
export const Products = [Barley, Lentils, Dairy];

export class PerProduce {
    private m: Map<Product, number>;

    constructor(m: Map<Product, number> = new Map()) {
        this.m = m;
    }

    get(p: Product): number {
        return this.m.get(p) || 0;
    }

    max(): [Product, number] {
        return [...this.m.entries()].reduce((a, b) => a[1] > b[1] ? a : b);
    }

    incr(pa: [Product, number]): void {
        this.m.set(pa[0], this.get(pa[0]) + pa[1]);
    }

    map(f: (p: Product, v: number) => number): PerProduce {
        return new PerProduce(new Map([...this.m].map(([p, v]) => [p, f(p, v)])));
    }

    entries(): [Product, number][] {
        return [...this.m.entries()];
    }
    
    static of(o: [string, number][] = []) {
        return new PerProduce(new Map(o.map(([k, v]) => [Product.fromName(k), v])));
    }

    withIncr(p: Product, incr: number): PerProduce {
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
        readonly product: Product,
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
        totals[alloc.terrain.name].incr([alloc.product, p]);
        totals.Total.incr([alloc.product, p]);
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
    // Make lentils a little less valuble so that marginal utilities
    // aren't always identical. In practice they will usually be most
    // lacking in barley, so it should be more valuable.
    let plants = p.get(Barley) + 0.8 * p.get(Lentils);
    let animals = p.get(Dairy);
    if (plants < 0.2 * (plants + animals)) {
        const convert = 0.2 * (plants + animals) - plants;
        plants += convert / 2;
        animals -= convert;
    }
    // 90% diet value even with optimal mix, because if this comes
    // out higher than agrarianDietValue, it's because the diet is
    // entirely missing a food type.
    return 1.8 * Math.pow(plants, 0.5) * Math.pow(animals, 0.5);
}

function agrarianDietValue(p: PerProduce) {
    let [c, l, a] = [p.get(Barley), p.get(Lentils), p.get(Dairy)];
    return 3 * Math.pow(c, 0.25) * Math.pow(l, 0.25) * Math.pow(a, 0.5);
}
