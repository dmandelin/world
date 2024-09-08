import { World } from './world';
import { Polity } from './polity';
import { Allocation, BuildingPlot, marginalUtilitiesOfLabor, marginalUtilitiesOfLand, Product, TempleConstruction } from './production';
import { PerProduce, PerTerrainPerProduce, production, capacity, marginalCapacity, reallocated } from './production';
import { Terrain, Alluvium, DryLightSoil, Desert } from './production';
import { Barley, Lentils, Dairy } from './production';
import { Market } from './trade';
import { ProductionTech, TechKit } from './tech';
import { mapmax, mapmin, randelem, randint } from './lib';
import { TimeSeries } from '../data/timeseries';
import { ReligiousSite, Temple } from './religion';
import { RaidEffects } from './raiding';
import { Culture, CultureGroups } from './culture';
import { Census, Population } from './population';
import { complexity, flourishing, freedom } from './ways';
import { Factor, Modifier } from '../data/calc';
import { TileProduction } from './production2';

export class TileModifiers {
    // Population growth factor.
    popGrowth = new Factor();

    // Mitigates happiness loss from poverty. A bonus is less than 1.
    hope = new Factor();
    // Boosts happiness gain from getting to basic healthy consumption. A bonus is greater than 1.
    grit = new Factor();
    // Happiness gain factor from having extra. Generally between 0 and 1.
    celebration = new Factor();

    // Farming output factor.
    farming = new Factor();
    // Herding output factor.
    herding = new Factor();
    // Transaction cost factor. A bonus is less than 1.
    trading = new Factor();

    // Raiding activity level factor.
    raidIntensity = new Factor();
    // Factor applied to amount of stuff captured on raids.
    raidCapture = new Factor();
    // Raiding mobility factor.
    raidMobility = new Factor();
}

export type TileModifierValues = {
    [K in keyof TileModifiers]?: number;
};

export class Tile {
    static readonly acres = 144000;

    private controller_: Polity;
    private pop_: Population;
    readonly culture: Culture;
    readonly religiousSite: ReligiousSite;

    readonly techKit: TechKit = new TechKit();

    private allocs_: Allocation[] = [];
    readonly market: Market = new Market(this);

    raidEffects = new RaidEffects();

    readonly mods = new TileModifiers();
    readonly prod = new TileProduction(this);

    readonly productionSeries = new TimeSeries<PerProduce>();
    readonly capacitySeries = new TimeSeries<number>();

    readonly flourishingSeries = new TimeSeries<number>();
    readonly complexitySeries = new TimeSeries<number>();
    readonly freedomSeries = new TimeSeries<number>();

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
    ) {
        if (this.isRiver && this.j <= 2) {
            this.mods.farming.apply('Euphrates', 1.2);
        }

        this.controller_ = controller;

        const cultureGroup = isRiver ? CultureGroups.ProtoSumerian : CultureGroups.DesertNomad;
        this.culture = cultureGroup.createCulture(this);
        this.culture.refreshModifiers(this);

        const initialPopulation = this.isRiver ? randint(1000, 3000) : randint(100, 300)
        this.pop_ = new Population(this, this.culture.initialPops(this, initialPopulation));

        this.religiousSite = this.culture.createReligiousSite();

        this.allocate();
        this.optimizeAllocations();
    }

    get name() { return this.controller.name; }

    updateProduction() {
        this.prod.update();
    }

    fractionOf(t: Terrain): number {
        switch (t) {
            case Alluvium: return this.wetFraction;
            case DryLightSoil: return this.dryLightSoilFraction;
            case Desert: return this.desertFraction;
            default: throw new Error(`Unknown terrain ${t}`);
        }
    }

    acresOf(t: Terrain): number {
        return Tile.acres * this.fractionOf(t);
    }

    outputFactor(p: Product): Factor {
        switch (true) {
            case p === Barley:
            case p === Lentils:
                return this.mods.farming;
            case p === Dairy:
                return this.mods.herding;
            default:
                return new Factor();
        }
    }

    updateTimeSeries() {
        this.pop_.updateTimeSeries();
        this.flourishingSeries.add(this.world.year, flourishing(this));
        this.complexitySeries.add(this.world.year, complexity(this));
        this.freedomSeries.add(this.world.year, freedom(this));

        this.productionSeries.add(this.world.year, this.production.Total);
        this.capacitySeries.add(this.world.year, this.capacity);
        this.controller.updateTimeSeries();
    }

    applyConstruction(): void {
        const construction = this.production.Building.get(TempleConstruction);
        if (construction > 0 && this.religiousSite instanceof Temple) {
            if (this.religiousSite.applyConstruction(construction)) {
                this.religiousSite.refreshModifiers(this);
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

    get settlementsDescription(): string {
        return this.pop.settlementsDescription;
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

    get pop() { return this.pop_; }
    get population() { return this.pop_.n; }

    // Understanding population growth
    //
    // Historical populations, growth rates, and birth and death rates are
    // all incredibly murky. We'll start with some historical guesses, 
    // estimate growth rates, and then understand how those growth rates
    // would be represented in this model.
    //
    // https://en.wikipedia.org/wiki/Estimates_of_historical_world_population
    // has several estimates, which vary widely in total population but are
    // a little more consistent in growth rates. Arbitrarily combining various
    // series, we these global values in millions:
    // - 10000 BC:   2
    // -  9000 BC:   4
    // -  8000 BC:   5
    // -  7000 BC:   8
    // -  6000 BC:  10
    // -  5000 BC:  20
    // -  4000 BC:  50
    // -  3000 BC:  100
    // -  2000 BC:  100
    // -  1000 BC:  100
    // -   500 BC:  150
    // -     1 AD:  300
    // -   500 AD:  280
    // -  1000 AD:  400
    // -  1500 AD:  600
    // -  1700 AD:  700
    // -  1800 AD: 1000
    // -  1900 AD: 1700
    // -  2000 AD: 6000
    //
    // Analysis:
    // - Long-term growth rates vary widely and are even zero for a millenium
    //   or more in some periods.
    // - Prehistoric times saw roughly a doubling per millenium, but growth
    //   ceasing around 3000 BC, which may be associated with pandemic, agricultural
    //   crisis, and other population limits.
    //   - Total growth in that period is 50x. This corresponds to both the
    //     spread of agriculture, which seems to have increased populations
    //     by 10x, with the rest from further increasing arable land plus 
    //     increasing productivity.
    //   - Rates
    //     - 50x growth over 7000 years is 0.05% annual growth or 1% per 20-year turn.
    //     - 10x growth over 7000 years is 0.03% annual growth or 0.7% per 20-year turn.
    //   - The slow rates suggest these populations tended to be near carrying capacity,
    //     but the steady exponential growth suggests that in some way they were not.
    //     - I think the point is that the resources to grow -- spare resources
    //       for child care, migration, and clearing new land -- were scarce, and
    //       thus growth rates were low even though carrying capacity was high.
    //     - This means growth rates should be lower when the ecology requires more
    //       capital investment, but for now we don't have many ecologies so we don't
    //       have to worry about that yet.
    //     - The question comes up, how does population growth vary in those times?
    //       It could be faster when agriculture is first being established in a
    //       given area and then a bit lower later on.
    //       - Agriculture spread approximately 1km/year, so one of our tiles could
    //         have agriculture spread to it in about one turn. But a 10x population
    //         increase in 20 years is a 12% increase per year, which seems way too
    //         fast.
    //       - It must have taken several generations for a new area to fill up. If
    //         population grew at 1-2% per year it would fill up in 5-10 turns.
    //       - We'll have to fiddle with parameters, but broadly it seems maximum
    //         population growth rate should be 1-2%, but overall growth work out
    //         to about one doubling per millenium, or 1-2% per 20-year turn.
    // - Population did not grow during two periods, 3000-1000 BC and 1-500 AD.
    //   - The first period seems to have seen the Indo-European migrations
    //     and collapse of farming societies in Europe, the collapse of the Indus
    //     Valley civilization, and the Bronze Age collapse in the Near East.
    //     There may have been some sort of pandemic and/or ecological crisis.
    //   - The second period saw the fall of the classical civilizations and
    //     some pandemics.
    //   - It's a natural question what enabled population to grow again, and I'm
    //     sure we'll have to explore that in more depth later. Some possibilities
    //     include resistance to disease, further technology development, ecological
    //     improvements, and trade networks recovering.
    //   - Classical and medieval growth rates were similar to prehistoric rates,
    //     about a doubling per millenium or 1-2% per 20-year turn.
    // - The takeoff started aroud 1700. 
    //   - Here are growth rates year, turn, and century:
    //     - premodern: 0.07%,  1.4%,   7%
    //     - 1700-1800: 0.36%,  7.4%,  43%
    //     - 1800-1900: 0.53%, 11.1%,  70%
    //     - 1900-2000: 1.27%, 28.7%, 350%
    //   - All kinds of new things are happening and the situation as much more
    //     dynamic!
    //
    // Ideas for representing the premodern case:
    // - For our model of southern Mesopotamia 5000-4000 BC, we have three sources 
    //   of population growth:
    //   - Natural increase: more births than deaths
    //   - Yield improvements due to technology and religion
    //   - Irrigating more land
    // - We want there to be not so much population pressure at the beginning of
    //   the period, but just starting to have some at the end.
    //   - Maybe TFP 1.1-1.25 at the start, around 1 at the end.
    //   - So for population to increase by 2x, capacity should only increase
    //     1.6-1.8x.
    // - Since the population growth rate is assumed to have been fairly steady,
    //   it seems that we have to assume carrying capacity was the target built-out
    //   number of 300M using technology of the time.
    //   - This suggests it might hard to make a logistic growth curve work here,
    //     but we might end up coming back to it.
    // - Let's assume "actual capacity" increases by 1.6-1.8, due to technology
    //   and irrigation in roughly equal amounts. 
    //   - That's 1.2-1.4% each per millenium. We already have technology in there 
    //     in one big shock per product.
    //   - We can then allow irrigation at some appropriate rate.
    // - Some target growth rates per turn for TFP levels:
    //   - 0.7: 0
    //   - 1.0: 1.4%
    //   - 2.0: 10%? might be way too high, extrapolation of 6% more reasonable
    // - If death rate is 40 per 1000, corresponding birth rates would be:
    //   - 0.7: 30
    //   - 1.0: 31.5
    //   - 2.0: 36, seems vaguely reasonable again
    //
    // Finally, we have the puzzle of raiding losses, which seem to be very large
    // compared to population growth. How is it that populations can enough births
    // to grow just a tiny bit? But if they are at carrying capacity, then it makes
    // sense that growth is slow and vaguely tracks carrying capacity.
    //
    // Perhaps the solution is this: from the time that "human culture as we know it"
    // has existed (since approximatly 50,000 BP), the carrying capacity has not been
    // the "literal margin of survival", but rather, the number of people that can
    // "live as we're accustomed to".
    // - So we could use a carrying capacity model with the amount of required
    //   consumption set according to cultural expectations.
    //   - But then we need to introduce ways to overshoot at least a little.
    // - In a birth rate/death rate or population growth model, so far the best idea
    //   I've had is to calibrate to a target population growth rate.
    //
    // The version I'm about to check in is somewhat improved, but it doesn't really
    // work right. Raiding losses and capacity don't seem to work together in the
    // right way: the basic logistic model probably incorporates whatever amount of
    // raiding activity there would be. But we want changes there to be meaningful,
    // so that a reduction in raiding could lead to substantial population growth.
    // We probably need some target population growth concept.

    updatePopulation() {
        this.pop_.update();
        this.religiousSite.refreshModifiers(this);
    }

    get prevCensus(): Census {
        return this.pop_.censusSeries.prevValue;
    }

    get census(): Census {
        return this.pop_.census;
    }

    get censusSeries(): TimeSeries<Census> {
        return this.pop_.censusSeries;
    }
}