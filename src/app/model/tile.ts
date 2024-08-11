import { World } from './world';
import { Polity } from './polity';
import { Allocation, BuildingPlot, marginalUtilitiesOfLabor, marginalUtilitiesOfLand, Product, TempleConstruction } from './production';
import { PerProduce, PerTerrainPerProduce, production, capacity, marginalCapacity, reallocated } from './production';
import { Terrain, AllTerrainTypes, Alluvium, DryLightSoil, Desert } from './production';
import { Barley, Lentils, Dairy } from './production';
import { Market, TradeLink } from './trade';
import { Settlement, SettlementTier } from './settlements';
import { ProductionTech, TechKit } from './tech';
import { argmax, mapmax, mapmin, randelem, randint } from './lib';
import { TimeSeries } from '../data/timeseries';
import { BonusKey, HolySite, ReligiousSite, ReligiousTraits, Temple } from './religion';
import { RaidEffects } from './raiding';
import { Culture, CultureGroups } from './culture';

export class Tile {
    private controller_: Polity;
    private tradePartners_ = new Set<Tile>();

    private population_: number;

    readonly culture: Culture;
    readonly religiousSite: ReligiousSite;

    readonly techKit: TechKit = new TechKit();

    private allocs_: Allocation[] = [];
    readonly market: Market = new Market(this);

    raidEffects = new RaidEffects();

    readonly productionSeries = new TimeSeries<PerProduce>();
    readonly capacitySeries = new TimeSeries<number>();
    readonly populationSeries = new TimeSeries<number>();
    readonly raidEffectSeries = new TimeSeries<RaidEffects>();

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
        this.population_ = this.isRiver ? randint(3000, 6000) : randint(300, 600);

        const cultureGroup = isRiver ? CultureGroups.Sumerian : CultureGroups.Akkadian;
        this.culture = cultureGroup.createCulture(this);
        this.religiousSite = this.culture.createReligiousSite();

        this.allocate();
        this.optimizeAllocations();
    }

    get name() { return this.controller.name; }

    bonus(b: BonusKey): number {
        return (this.religiousSite.bonus(b, this.population) ?? 1) *
            (this.culture.group.bonuses[b] ?? 1);
    }

    outputBoost(p: Product): number {
        switch (true) {
            case p === Barley:
            case p === Lentils:
                return this.bonus('agrarianOutputFactor');
            case p === Dairy:
                return this.bonus('pastoralOutputFactor');
            default:
                return 1;
        }
    }

    updateTimeSeries() {
        this.productionSeries.add(this.world.year, this.production.Total);
        this.capacitySeries.add(this.world.year, this.capacity);
        this.populationSeries.add(this.world.year, this.population);
        this.raidEffectSeries.add(this.world.year, this.raidEffects);
    }

    applyConstruction(): void {
        const construction = this.production.Building.get(TempleConstruction);
        if (construction > 0 && this.religiousSite instanceof Temple) {
            if (this.religiousSite.applyConstruction(construction)) {
                this.world.log.turnlog(`${this.controller.name} builds ${this.religiousSite.name}`);
            }
        }
    }

    updateMarket(): void {
        this.market.update()
    }

    adoptNeighborTechs(snapshot: Map<Tile, Map<Product, ProductionTech>>): void {
        for (const n of this.neighbors) {
            for (const st of this.techKit.techs) {
                const nt = snapshot.get(n)!.get(st.product)!;
                if (st.next.has(nt) && this.production.Total.get(st.product) > 0) {
                    this.techKit.adopt(nt);
                    this.world.log.turnlog(`${this.controller.name} adopts ${nt.name} from ${n.controller.name}`);
                }
            }
        }
        this.updateTechs();
    }

    advanceTechKit(): void {
        const newTechs = this.techKit.advance(this.population, this.allocs);
        if (newTechs.length) {
            this.updateTechs();
            this.world.log.turnlog(`${this.controller.name} advances techs: ${newTechs.map(t => t.name).join(', ')}`);
        }
    }

    updateTechs(): void {
        this.allocs_ = this.allocs.map(a => a.updateTech(this.techKit.get(a.product)));
    }

    get neighbors(): Tile[] {
        const ns = [];
        for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const [ni, nj] = [this.i + di, this.j + dj];
            if (ni < 0 || nj < 0 || ni >= this.world.map.height || nj >= this.world.map.width) {
                continue;
            }
            ns.push(this.world.map.tiles[ni][nj]);
        }
        return ns;
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
            case BuildingPlot: return 0;
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

    allocate() {
        this.allocs_ = this.defaultAllocs();
        this.world.notifyWatchers();
    }

    defaultAllocs() {
        return this.isRiver ? [
            new Allocation(this, Barley, this.techKit.get(Barley), Alluvium, 1, 0.4),
            new Allocation(this, Lentils, this.techKit.get(Lentils), DryLightSoil, 0.7, 0.3),
            new Allocation(this, Dairy, this.techKit.get(Dairy), DryLightSoil, 0.3, 0.15),
            new Allocation(this, Dairy, this.techKit.get(Dairy), Desert, 1, 0.14),
            new Allocation(this, TempleConstruction, this.techKit.get(TempleConstruction), BuildingPlot, 0, 0.01),
        ] : [
            new Allocation(this, Barley, this.techKit.get(Barley), Alluvium, 1, 0.01),
            new Allocation(this, Lentils, this.techKit.get(Lentils), DryLightSoil, 0.75, 0.30),
            new Allocation(this, Dairy, this.techKit.get(Dairy), DryLightSoil, 0.25, 0.10),
            new Allocation(this, Dairy, this.techKit.get(Dairy), Desert, 1, 0.6),
        ];
    }

    optimizeAllocations() {
        let bestCapacity = 0;
        for (let i = 0; i < 200; ++i) {
            const c = this.optimizeAllocationsOneStep(true);
            if (c <= bestCapacity) break;
        }
        this.world.notifyWatchers();
    }

    optimizeAllocationsOneStep(batch = false): number {
        const d = 0.01
        const muk = marginalUtilitiesOfLand(this, this.allocs);
        const mul = marginalUtilitiesOfLabor(this, this.allocs);

        // Best gain possible from labor reallocation.
        const bestMul = mapmax(mul, a => a.terrain !== BuildingPlot);
        const worstMul = mapmin(mul, a => a.terrain !== BuildingPlot && a.laborFraction >= d);
        const mulGain = bestMul[1] - worstMul[1];

        // Group MUKs by terrain type because we can only reallocate within the same terrain.
        const mukByTerrain = new Map<Terrain, Map<Allocation, number>>();
        for (const [a, u] of muk) {
            const terrain = a.terrain;
            if (!mukByTerrain.has(terrain)) {
                mukByTerrain.set(terrain, new Map());
            }
            mukByTerrain.get(terrain)!.set(a, u);
        }

        let bestMuk = undefined;
        let worstMuk = undefined;
        let mukGain = 0;
        for (const [terrain, tmuk] of mukByTerrain) {
            if (tmuk.size < 2) continue;

            const bestTMuk = mapmax(tmuk, a => a.terrain !== BuildingPlot);
            const worstTMuk = mapmin(tmuk, a => a.terrain !== BuildingPlot && a.landFraction >= d);
            const tmukGain = bestTMuk[1] - worstTMuk[1];
            if (tmukGain > mukGain) {
                [bestMuk, worstMuk, mukGain] = [bestTMuk, worstTMuk, tmukGain];
            }
        }

        if (mukGain > mulGain && worstMuk && worstMuk[0] !== undefined) {
            // Reallocating land is more beneficial, so do that.
            this.allocs_ = reallocated(this.allocs_, worstMuk[0], bestMuk![0]!, d, 0);
        } else if (mulGain > 0 && worstMul[0] !== undefined) {
            this.allocs_ = reallocated(this.allocs_, worstMul[0], bestMul[0]!, 0, d);
        }

        if (!batch) {
            this.world.notifyWatchers();
        }
        return this.capacity;
    }

    get production(): PerTerrainPerProduce {
        return production(this.allocs_);
    }

    get consumption(): PerProduce {
        let c = this.production.Total;
        for (const l of this.market.links) {
            for (const [send, recv] of l.exchanges) {
                c.incr([send.product, -send.gross]);
                c.incr([recv.product, recv.net]);
            }
        }
        return c;
    }

    get preTradeCapacity() {
        return capacity(this.production.Total);
    }

    get capacity() {
        const c = capacity(this.consumption);
        if (isNaN(c)) {
            throw new Error(`Invalid capacity ${c}`);
        }
        return c;
    }

    get marginalCapacity(): PerProduce {
        return marginalCapacity(this.consumption);
    }

    get controller() { return this.controller_; }
    set controller(value: Polity) { this.controller_ = value; }

    get population() { return this.population_; }
    set population(value: number) { this.population_ = value; }

    get baseGrowthRate() {
        return 0.4;
    }

    get prevCapacityGrowthFactor() {
        if (this.populationSeries.length < 1) return 0;
        const r = this.populationSeries.prevValue / this.capacitySeries.prevValue;
        return (1 - r);
    }

    get prevGrowthRate() {
        return this.baseGrowthRate 
            * this.prevCapacityGrowthFactor 
            // TODO - Should actually be the factor as it was last turn, but we
            // don't want to save the entire history of every intermediate value.
            * this.bonus('populationGrowthFactor');
    }

    get lastPopulationChange() {
        if (this.populationSeries.length < 2) return 0;
        return (this.populationSeries.lastValue - this.populationSeries.prevValue) / 
            (this.populationSeries.prevValue ?? 1);
    }

    updatePopulation() {
        const [p, c] = [this.population, this.capacity];
        if (p == 0) return;
        const r = p / c;
        const dp = Math.floor(this.baseGrowthRate 
            * (1 - r) 
            // TODO - Positive bonuses perhaps shouldn't increase negative growth.
            * this.bonus('populationGrowthFactor') 
            * p);
       
        this.population = Math.max(p + dp, Math.floor(0.65 * c));
        this.population += this.raidEffects.deltaPopulation;
        if (isNaN(this.population)) {
            throw new Error(`Invalid population ${this.population}`);
        }
    }
}