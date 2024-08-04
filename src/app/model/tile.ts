import { World } from './world';
import { Polity } from './polity';
import { Allocation, BuildingPlot, Product, TempleConstruction } from './production';
import { PerProduce, PerTerrainPerProduce, production, capacity, marginalCapacity, reallocated } from './production';
import { Terrain, AllTerrainTypes, Alluvium, DryLightSoil, Desert } from './production';
import { Barley, Lentils, Dairy } from './production';
import { Market, TradeLink } from './trade';
import { Settlement, SettlementTier } from './settlements';
import { ProductionTech, TechKit } from './tech';
import { randelem, randint } from './lib';
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
        //this.population_ = this.isRiver ? randint(1000, 3000) : randint(80, 250);
        // Put a wide range of populations on the map so we can see how that
        // affects economics.
        const popFactor = (1 + i * 5 + j) / 2.5;
        const basePopulation = this.isRiver ? randint(1000, 3000) : randint(80, 250);
        this.population_ = Math.floor(basePopulation * popFactor);

        const cultureGroup = isRiver ? CultureGroups.Sumerian : CultureGroups.Akkadian;
        this.culture = cultureGroup.createCulture(this);
        this.religiousSite = this.culture.createReligiousSite();

        this.ratioizeLabor();
        this.optimizeLabor();
    }

    get name() { return this.controller.name; }

    bonus(b: BonusKey): number {
        return this.religiousSite.bonus(b, this.population) ?? 1;
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

    ratioizeLabor() {
        if (this.religiousSite instanceof Temple) {
            this.allocs_ = [
                new Allocation(this, Barley, this.techKit.get(Barley), Alluvium, 1, 0.99 * this.wetFraction),
                new Allocation(this, Lentils, this.techKit.get(Lentils), DryLightSoil, 1, 0.99 * this.dryLightSoilFraction),
                new Allocation(this, Dairy, this.techKit.get(Dairy), Desert, 1, 0.99 * this.desertFraction),
                new Allocation(this, TempleConstruction, this.techKit.get(TempleConstruction), BuildingPlot, 0, 0.01),
            ];
        } else {
            this.allocs_ = [
                new Allocation(this, Barley, this.techKit.get(Barley), Alluvium, 1, this.wetFraction),
                new Allocation(this, Lentils, this.techKit.get(Lentils), DryLightSoil, 1, this.dryLightSoilFraction),
                new Allocation(this, Dairy, this.techKit.get(Dairy), Desert, 1, this.desertFraction),
            ];
        }
        this.world.notifyWatchers();
    }

    equalizeLabor() {
        if (this.religiousSite instanceof Temple) {
            this.allocs_ = [
                new Allocation(this, Barley, this.techKit.get(Barley), Alluvium, 1, 0.33),
                new Allocation(this, Lentils, this.techKit.get(Lentils), DryLightSoil, 1, 0.33),
                new Allocation(this, Dairy, this.techKit.get(Dairy), Desert, 1, 0.33),
                new Allocation(this, TempleConstruction, this.techKit.get(TempleConstruction), BuildingPlot, 0, 0.01),
            ];
        } else {
            this.allocs_ = [
                new Allocation(this, Barley, this.techKit.get(Barley), Alluvium, 1, 0.34),
                new Allocation(this, Lentils, this.techKit.get(Lentils), DryLightSoil, 1, 0.33),
                new Allocation(this, Dairy, this.techKit.get(Dairy), Desert, 1, 0.33),
            ];
        }
        this.world.notifyWatchers();
    }

    optimizeLaborOneStep(batch = false): number {
        let bestAllocs: Allocation[] = [];
        let bestCapacity = 0;
        for (const terrainFrom of AllTerrainTypes) {
            for (const terrainTo of AllTerrainTypes) {
                if (terrainFrom === terrainTo) continue;
                if (terrainFrom === BuildingPlot || terrainTo === BuildingPlot) continue;
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
        for (const l of this.market.links) {
            for (const [send, recv] of l.exchanges) {
                c.incr([send.product, -send.gross]);
                c.incr([recv.product, recv.net]);
            }
        }
        return c;
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
            this.populationSeries.prevValue;
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