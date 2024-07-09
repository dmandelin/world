import {World} from './world';
import {Polity} from './polity';
import {Allocation, Product} from './production';
import {PerProduce, PerTerrainPerProduce, production, capacity, marginalCapacity, reallocated} from './production';
import {Terrain, AllTerrainTypes, Alluvium, DryLightSoil, Desert} from './production';
import {Barley, Lentils, Dairy} from './production';
import {Market, TradeLink} from './trade';
import {Settlement, SettlementTier} from './settlements';
import {randint} from './lib';

export class Tile {
    private controller_: Polity;
    private tradePartners_= new Set<Tile>();

    private population_: number;
    private construction_: number;

    private allocs_: Allocation[] = [];
    readonly market: Market = new Market(this);

    // Each tile is eventually supposed to potentially host a city of 10K+, implying a tile
    // population of 50K+. That means each tile is apparently 50 square miles.

    constructor(
        public readonly world: World,
        public readonly i: number, 
        public readonly j: number, 
        controller: Polity,
        public readonly isRiver: boolean,
        public readonly wetFraction: number,
        public readonly dryLightSoilFraction: number,
        capacityRatio: number,
        ) {
        this.controller_ = controller;
        //this.population_ = this.isRiver ? randint(1000, 3000) : randint(80, 250);
        // Put a wide range of populations on the map so we can see how that
        // affects economics.
        const popFactor = (1 + i * 5 + j) / 2.5;
        const basePopulation = this.isRiver ? randint(1000, 3000) : randint(80, 250);
        this.population_ = Math.floor(basePopulation * popFactor);
        this.construction_ = Math.floor(0.1 * this.population_);

        this.ratioizeLabor();
        this.optimizeLabor();
    }

    updateMarket(): void {
        this.market.update()
    }

    settlements(): Settlement[] {
        return Settlement.zipfSettlements(this.population);
    }

    settlementTiers(): SettlementTier[] {
        return Settlement.zipfSettlementTiers(this.population);
    }

    areaFraction(terrain: Terrain): number {
        switch (terrain) {
            case Alluvium: return this.wetFraction;
            case DryLightSoil: return this.dryLightSoilFraction;
            case Desert: return this.desertFraction;
            default: throw new Error(`Invalid terrain ${terrain}`);
        }
    }

    get desertFraction(): number {
        return 1 - this.wetFraction - this.dryLightSoilFraction;
    }

    // General facts about production.
    // (Yield rating order: none, low, marginal, moderate, good, high, excellent)
    //
    // Primary yields for agriculture and pasturage:
    //
    //                      Barley        Lentils       Dairy
    // Alluvium             excellent     good          moderate
    // Dry light soil       low           moderate      moderate (grazing)
    // Desert               none          none          marginal (grazing)
    //
    // - Grazing uses 10x the land as agriculture.
    // - Barley is more labor-intensive than lentils and degrades soil quality if not managed.
    // - Lentils improve soil quality.
    //
    // Hunting and gathering yields a balanced combination of all products, but
    // requires 10-1000x the land area.

    get allocs(): readonly Allocation[] {
        return this.allocs_;
    }

    ratioizeLabor() {
        this.allocs_ = [
            new Allocation(this, Barley, Alluvium, 1, this.wetFraction),
            new Allocation(this, Lentils, DryLightSoil, 1, this.dryLightSoilFraction),
            new Allocation(this, Dairy, Desert, 1, this.desertFraction),
        ];
        this.world.notifyWatchers();
    }

    equalizeLabor() {
        this.allocs_ = [
            new Allocation(this, Barley, Alluvium, 1, 0.34),
            new Allocation(this, Lentils, DryLightSoil, 1, 0.33),
            new Allocation(this, Dairy, Desert, 1, 0.33),
        ];
        this.world.notifyWatchers();
    }

    optimizeLaborOneStep(batch = false): number {
        let bestAllocs: Allocation[] = [];
        let bestCapacity = 0;
        for (const terrainFrom of AllTerrainTypes) {
            for (const terrainTo of AllTerrainTypes) {
                if (terrainFrom === terrainTo) continue;
                const allocs = reallocated(this.allocs_, terrainFrom, terrainTo, 0.01);
                if (allocs === undefined) continue;
                const p = production(allocs);
                const c = capacity(p.Total);
                if (c > bestCapacity) {
                    bestAllocs = allocs;
                    bestCapacity = c;
                }
            }
        }

        if (bestCapacity) {
            this.allocs_ = bestAllocs;
        }
        if (!batch) {
            this.world.notifyWatchers();
        }
        return bestCapacity;
    }

    optimizeLabor() {
        let bestCapacity = 0;
        for (let i = 0; i < 200; ++i) {
            const c = this.optimizeLaborOneStep(true);
            if (c <= bestCapacity) break;
        }
        this.world.notifyWatchers();
    }
    

    get production(): PerTerrainPerProduce {
        return production(this.allocs_);
    }

    get consumption(): PerProduce {
        let c = this.production.Total;
        for (const l of this.market.tradeLinks) {
            for (const [p, a] of l.srcAmounts.entries()) {
                c.incr(p, -a);
            }
            for (const [p, a] of l.dstAmounts.entries()) {
                c.incr(p, a);
            }
        }
        return c;
    }

    get capacity() {
        return capacity(this.consumption);
    }

    get marginalCapacity(): PerProduce {
        return marginalCapacity(this.consumption);
    }

    get controller() { return this.controller_; }
    set controller(value: Polity) { this.controller_ = value; }

    get construction() { return this.construction_; }
    get constructionDensity() { return this.construction_ / this.population_; }
    get constructionDisplay() { 
        return `${Math.floor(this.construction)}, ${Math.floor(this.constructionDensity*100)}%`;
    }

    constructTurn() {
        this.construction_ += this.population / 20;
        const maxConstruction = this.population * 1.5;
        this.construction_ = Math.round(Math.min(this.construction_, maxConstruction));
    }

    get population() { return this.population_; }
    set population(value: number) { this.population_ = value; }

    get attackPower() {
        const constructionFactor = 1.0 + this.constructionDensity * 0.25;
        return constructionFactor * this.population;
    }

    get defensePower() {
        const constructionFactor = 1.0 + this.constructionDensity;
        return constructionFactor * this.population;
    }

    updatePopulation() {
        const [p, c] = [this.population, this.capacity];
        const r = p / c;
        const dp = Math.floor(0.4 * r * (1 - r) * p);
        this.population = Math.max(p + dp, Math.floor(0.65 * c));
    }

    get tradePartners(): ReadonlySet<Tile> {
        return this.tradePartners_;
    }

    hasTradePartners(): boolean {
        return this.tradePartners_.size > 0;
    }

    clearTradePartners() {
        this.tradePartners_.clear();
    }

    addTradePartner(t: Tile) {
        this.tradePartners_.add(t);
        t.tradePartners_.add(this);
    }

    get culture(): number {
        return Math.floor(Math.pow(0.05 * Math.min(this.construction, this.population * 2), 1.5));
    }

    get culturalInfluences(): Map<Tile, number> {
        const m = new Map<Tile, number>();
        for (const t of this.world.map.tiles.flat()) {
            const [dx, dy] = [t.i - this.i, t.j - this.j];
            const ds = Math.sqrt(dx * dx + dy * dy);
            const penalty = Math.pow(0.5, ds);
            const homeBonus = t == this ? 50 : 0
            const effectiveCulture = t.culture * penalty + homeBonus;
            if (effectiveCulture > 0) {
                m.set(t, effectiveCulture)
            }
        }
        const least = Math.min(...m.values());
        let total = 0;
        for (const k of m.keys()) {
            const v = (m.get(k) || 0) / least;
            const ev = v * v;
            m.set(k, ev);
            total += ev;
        }
        for (const k of m.keys()) {
            const v = (m.get(k) || 0) / total;
            m.set(k, v);
        }
        return m;
    }
}