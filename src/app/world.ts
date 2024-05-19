import { Injectable } from "@angular/core";
import {Brain, BasicBrain, DefensiveBrain, NullBrain, SubjectBrain} from "./brains";
import {cityNames} from './content';
import { TemplateLiteral } from "@angular/compiler";

// Top TODOs
// - compute better allocations
//   - plan: pull out production into a function we can call for hypotheticals
//           create routine to do gradient ascent on land and/or labor allocations
//           at first, log the results and examine what we get
//           later, apply to actual allocations
// - trade food for increased production
// - trade for obsidian for labor productivity and health bonuses
// - trade for lapis lazuli for culture bonuses
// - craft specialists: tools, cloth, pottery, jewelry

@Injectable({providedIn: 'root'})
export class World {
    private year_ = 0;
    private polities_ = NAMED_DEFAULT_POLITIES.map((pd, i) => 
        new Polity(this, pd.name, pd.mapColor, randelem(World.BRAINS)));
    readonly map = new WorldMap(this, 5, 5, this.polities);
    readonly log = new WorldLog();

    lastPopulation = new Map<Tile, number>();
    lastAttacks = new Set<[Polity, Polity]>();

    private watchers_: Set<Function> = new Set<Function>();
    private locallyControlledPolities = new Set<string>(['E']);

    constructor() {
        this.updateLastPopulation();
        this.recordRanks();
    }

    isLocallyControlled(p: Polity) {
        return this.locallyControlledPolities.has(p.name);
    }

    clearLocalControl() {
        this.locallyControlledPolities.clear();
    }

    updateLastPopulation() {
        for (const tile of this.map.tiles.flat()) {
            this.lastPopulation.set(tile, tile.population);
        }
    }

    populationChange(tile: Tile): number {
        const last = this.lastPopulation.get(tile);
        if (last === undefined) return 0;
        return (tile.population - last) / (last || 1);
    }

    recordRanks() {
        let i = 1;
        for (const polity of this.getRankedPolities()) {
            polity.historicalRanks.push([this.year, i++]);
        }
    }

    static BRAINS = [
        new BasicBrain('A', 1.0),
        new SubjectBrain('S', 0.66, 0.5),
        new BasicBrain('N', 0.5, 0.4),
        new DefensiveBrain('D', 0.33),
        new DefensiveBrain('P', 0.2),
        new SubjectBrain('U', 0.0),
    ];

    addWatcher(w: Function) {
        this.watchers_.add(w);
        return w;
    }

    removeWatcher(w: Function) {
        this.watchers_.delete(w);
    }

    setBrains(brains: readonly Brain[]) {
        for (let i = 0; i < brains.length; ++i) {
            this.polities_[i].setBrain(brains[i]);
        }
    }

    get year() { return this.year_; }

    get polities() { return this.polities_; }
    private set polities(value: Polity[]) { this.polities_ = value; }

    get capacity() {
        return this.map.tiles.flat().map(t => t.capacity).reduce((a, b) => a + b);
    }

    get population() {
        return this.map.tiles.flat().map(t => t.population).reduce((a, b) => a + b);
    }

    private advanceState: 'startTurn'|'skipAction'|'continue' = 'startTurn';
    private actorState: number = 0;

    get actor(): Polity { return this.polities_[this.actorState]; }

    get advanceStateDisplay() {
        switch (this.advanceState) {
            case 'startTurn':
                return 'Click to start turn';
            case 'skipAction':
                return 'Click to attack or skip';
            case 'continue':
                return 'Click to continue';
        }
    }

    advance() {
        switch (this.advanceState) {
            case 'startTurn':
                this.advanceTurnStart();
                if (this.advanceTurnAct()) {
                    this.advanceState = 'skipAction';
                    this.notifyWatchers();
                    return;
                }
                this.advanceTurnFinish();
                this.notifyWatchers();
                break;
            case 'skipAction':
                //this.resolveConstruct(this.actor);
                this.skipAction();
                if (this.advanceTurnAct()) {
                    this.advanceState = 'skipAction';
                    this.notifyWatchers();
                    return;
                }
                this.advanceTurnFinish();
                this.advanceState = 'startTurn';
                this.notifyWatchers();
                break;
            case 'continue':
                this.skipAction();
                if (this.advanceTurnAct()) {
                    this.advanceState = 'skipAction';
                    this.notifyWatchers();
                    return;
                }
                this.advanceTurnFinish();
                this.advanceState = 'startTurn';
                this.notifyWatchers();
                break;
        }
    }

    advanceTurn() {
        this.advanceTurnStart();
        this.advanceTurnFinish();
    }

    advanceTurnStart() {
        this.updateLastPopulation();
        /*
        this.lastAttacks.clear();
        this.log.turnlogClear();

        if (this.year == 200) {
            this.log.turnlog('Large-scale irrigation works begun!');
            for (const t of this.map.tiles.flat()) {
                t.enableDryLightSoil();
            }
        }

        // Compute what alliance exists against each potential aggressor.
        for (const p of this.polities) {
            p.counterAlliance = p.neighboringPolities.filter(n => 
                n != p && n.brain.joinsCounterAlliance(this, n, p));
        }
        */
    }

    advanceTurnAct() {
        while (this.actorState < this.polities.length) {
            const p = this.polities[this.actorState];
            if (!this.polities.includes(p)) continue;
            
            //this.startTurnFor(p);
            if (!this.locallyControlledPolities.has(p.name)) {
                //p.brain.move(this, p);
            } else {
                return true;
            }

            ++this.actorState;
        }
        this.actorState = 0;
        return false;
    }

    actAttack(target: Polity) {
        const actor = this.polities[this.actorState];
        if (!actor.canAttack(target)[0]) {
            return;
        }
        this.performAttack(actor, target);
        
        this.advanceState = 'continue';
        this.notifyWatchers();
    }

    skipAction() {
        ++this.actorState; 
    }

    advanceTurnFinish() {
        //this.updateTradeLinks();
        this.map.updatePopulations();

        this.year_ += 20;
        this.recordRanks();
    }

    notifyWatchers() {
        for (const w of this.watchers_) {
            w();
        }
    }

    startTurnFor(p: Polity) {
        p.attacked.clear();
        p.defended.clear();
    }

    resolveConstruct(p: Polity) {
        if (p.suzerain) return;
        for (const t of this.map.tiles.flat()) {
            if (t.controller === p || t.controller.suzerain === p) {
                t.constructTurn();
            }
        }
    }

    performAttack(attacker: Polity, target: Polity) {
        this.resolveWar(this.setUpAttack(attacker, target));
    }

    setUpAttack(attacker: Polity, target: Polity): War {
        const ac = new Combatant(attacker, [attacker, ...attacker.vassals]);
        const defenders = attacker.counterAlliance.includes(target)
            ? attacker.counterAlliance : [target];
        const sovereignDefenders = [...new Set<Polity>(defenders.map(d => d.suzerain || d))];
        const dc = new Combatant(target.suzerain || target, sovereignDefenders.flatMap(d =>
            [d, ...[...d.vassals].filter(v => v !== attacker)]));
        return new War(this, attacker, ac, target, dc);
    }

    resolveWar(war: War) {
        this.lastAttacks.add([war.attacker, war.target]);

        this.log.turnlog('-');
        this.log.turnlog(`${war.attacker.name} attacks ${war.target.name}`)
        this.log.turnlog(`- AP = ${Math.floor(war.ap)} (${war.attackingCoalition.polities.map(p => p.name)})`);
        if (war.influenceAttackPenalty > 0.05) {
            this.log.turnlog(`- - attack impeded by ${Math.floor(war.influenceAttackPenalty*100)}% due to cultural sympathy!`);
        }
        this.log.turnlog(`- DP = ${Math.floor(war.dp)} (${war.defendingCoalition.polities.map(p => p.name)})`);

        war.attacker.attacked.add(war.target);
        war.target.defended.add(war.attacker);

        if (Math.random() < war.winp) {
            for (const p of war.attackingCoalition.polities) {
                this.losses(p, 0.01);
            }
            for (const p of war.defendingCoalition.polities) {
                this.losses(p, 0.05);
            }
            if (war.attacker.suzerain === war.target) {
                this.log.turnlog(`  Successful attack: ${war.attacker.name} throws off ${war.target.name}`);
                this.devassalize(war.target, war.attacker);            
            } else {
                this.log.turnlog(`  Successful attack: ${war.attacker.name} takes over ${war.target.name}`);
                this.vassalize(war.attacker, war.target);            
            }
        } else {
            this.log.turnlog(`  Failed attack`);
            for (const p of war.attackingCoalition.polities) {
                this.losses(p, 0.05);
            }
            for (const p of war.defendingCoalition.polities) {
                this.losses(p, 0.01);
            }
        }
    }

    losses(target: Polity, ratio: number) {
        for (const tile of this.map.tiles.flat()) {
            if (tile.controller == target) {
                tile.population -= Math.floor(ratio * tile.population);
            }
        }
    }

    takeover(attacker: Polity, defender: Polity) {
        for (const tile of this.map.tiles.flat()) {
            if (tile.controller == defender) {
                tile.controller = attacker;
            }
        }
        this.polities = this.polities.filter(p => p != defender);
    }

    vassalize(attacker: Polity, defender: Polity) {
        // Defender is removed from any existing suzerain.
        if (defender.suzerain) {
            defender.suzerain.vassals.delete(defender);
            const formerSuzerain = defender.suzerain;
            defender.suzerain = undefined;
            this.releaseDisconnectedVassals(formerSuzerain);
        }


        // Vassals of the defender are released.
        for (const v of defender.vassals) {
            v.suzerain = undefined;
        }
        defender.vassals.clear();

        // The new vassal relationship.
        defender.suzerain = attacker;
        attacker.vassals.add(defender);
    }

    devassalize(suzerain: Polity, vassal: Polity) {
        suzerain.vassals.delete(vassal);
        vassal.suzerain = undefined;
        this.releaseDisconnectedVassals(suzerain);
    }

    releaseDisconnectedVassals(p: Polity) {
        const connectedVassals = new Set<Polity>();
        const done = new Set<Tile>();
        const work: Tile[] = [];
        for (const t of this.map.tiles.flat()) {
            if (t.controller === p) {
                work.push(t);
            }
        }
        while (work.length) {
            const t = work.pop();
            done.add(t!);
            for (const n of this.neighoringTiles(t!)) {
                if (done.has(n)) continue;
                if (n.controller != p && n.controller.suzerain != p) continue;
                work.push(n);
                if (n.controller != p) {
                    connectedVassals.add(n.controller);
                }
            }
        }
        const oldVassals = p.vassals;
        p.vassals = new Set<Polity>([...p.vassals].filter(v => connectedVassals.has(v)));
        for (const v of oldVassals) {
            if (!p.vassals.has(v)) {
                v.suzerain = undefined;
            }
        }
    }

    foughtThisTurn(a: Polity, b: Polity): boolean {
        return a.attacked.has(b) || b.attacked.has(a);
    }

    neighoringTiles(tile: Tile): Tile[] {
        const ts = this.map.tiles;
        const ns = [];
        if (tile.i > 0) ns.push(ts[tile.i-1][tile.j]);
        if (tile.i < this.map.height - 1) ns.push(ts[tile.i+1][tile.j]);
        if (tile.j > 0) ns.push(ts[tile.i][tile.j-1]);
        if (tile.j < this.map.width - 1) ns.push(ts[tile.i][tile.j+1]);
        return ns;
    }

    getRankedPolities(): Polity[] {
        return [...this.polities].sort((a, b) => {
            const popDiff = b.vassalPopulation - a.vassalPopulation;
            if (popDiff) return popDiff;
            if (a.name < b.name) return -1;
            if (b.name < a.name) return 1;
            return 0;
        })
    }
}

class WorldLog {
    readonly turnlogs: string[] = [];

    turnlog(s: string) {
        this.turnlogs.push(s);
    }

    turnlogClear() {
        this.turnlogs.length = 0;
    }
}

class War {
    constructor(
        readonly world: World,
        readonly attacker: Polity,
        readonly attackingCoalition: Combatant,
        readonly target: Polity,
        readonly defendingCoalition: Combatant,
    ) {}

    readonly baseAP = this.attackingCoalition.attackPower;
    readonly influenceAttackPenalty = this.attacker.home.culturalInfluences.get(this.target.home) || 0;
    readonly ap = (1 - this.influenceAttackPenalty) * (
        this.target === this.attacker.suzerain
        ? this.attackingCoalition.defensePower
        : this.attackingCoalition.attackPower);
    readonly dp = this.target === this.attacker.suzerain
        ? this.defendingCoalition.attackPower
        : this.defendingCoalition.defensePower;
    readonly winp = this.ap * this.ap / (this.ap * this.ap + this.dp * this.dp);
}

class Combatant {
    constructor(public readonly leader: Polity, public readonly polities: readonly Polity[]) {}

    get attackPower(): number {
        return this.polities
            .map(p => p === this.leader ? p.attackPower : 0.25 * p.attackPower)
            .reduce((a, b) => a + b);
    }

    get defensePower(): number { 
        return this.polities
            .map(p => p.defensePower)
            .reduce((a, b) => a + b);
    }
}

function totalPopulation(ps: readonly Polity[]) {
    return ps
        .map(p => p.population)
        .reduce((a, b) => a + b, 0);
}

export class Polity {
    private brain_: Brain;

    vassals = new Set<Polity>();
    suzerain: Polity|undefined = undefined;
    counterAlliance: readonly Polity[] = [];

    attacked = new Set<Polity>();
    defended = new Set<Polity>();

    historicalRanks: [number, number][] = [];

    constructor(
        private readonly world: World, 
        readonly name: string,
        readonly mapColor: string,
        brain: Brain) {
        this.brain_ = brain;
    }

    get home(): Tile {
        for (const t of this.world.map.tiles.flat()) {
            if (t.controller === this) {
                return t;
            }
        }
        throw new Error(`No home tile for ${this.name}`)
    }

    get concurrentBattleModifier(): number {
        return 1.0 * Math.pow(0.8, this.defended.size) * Math.pow(0.7, this.attacked.size);
    }

    get counterAllianceDisplay(): string {
        if (this.counterAlliance.length === 0) return '';
        const names = sorted(this.counterAlliance, p => p.name).map(a => a.name).join(',');
        return `${names}:${Math.floor(totalPopulation(this.counterAlliance)/100)}`;
    }

    setBrain(brain: Brain) {
        this.brain_ = brain;
    }

    get brain(): Brain { return this.brain_; }

    get population(): number {
        return this.world.map.tiles
            .flat()
            .filter(t => t.controller == this)
            .map(t => t.population)
            .reduce((a, b) => a + b, 0);
    }

    get attackPower(): number {
        return this.concurrentBattleModifier * this.world.map.tiles
            .flat()
            .filter(t => t.controller == this)
            .map(t => t.attackPower)
            .reduce((a, b) => a + b, 0);
    }

    get defensePower(): number {
        return this.concurrentBattleModifier * this.world.map.tiles
            .flat()
            .filter(t => t.controller == this)
            .map(t => t.defensePower)
            .reduce((a, b) => a + b, 0);
    }

    get vassalPopulation(): number {
        return [this, ...this.vassals]
            .map(p => p.population)
            .reduce((a, b) => a + b, 0);
    }

    get vassalAP(): number {
        return [this, ...this.vassals]
            .map(p => p === this ? p.attackPower : 0.25 * p.attackPower)
            .reduce((a, b) => a + b, 0);
    }

    get vassalDP(): number {
        return [this, ...this.vassals]
            .map(p => p.defensePower)
            .reduce((a, b) => a + b, 0);
    }

    get neighbors(): Polity[] {
        const ns = new Set<Polity>();
        for (let i = 0; i < this.world.map.height; ++i) {
            for (let j = 0; j < this.world.map.width; ++j) {
                for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                    const [ni, nj] = [i+di, j+dj];
                    if (ni < 0 || nj < 0 || ni >= this.world.map.height || nj >= this.world.map.width) {
                        continue;
                    }
                    if (this.world.map.tiles[i][j].controller != this && 
                        this.world.map.tiles[ni][nj].controller == this) {
                        ns.add(this.world.map.tiles[i][j].controller);
                        break;
                    }
                }
            }
        }
        return [...ns];
    }

    get neighboringPolities(): Polity[] {
        const ns = this.vassalNeighbors;
        return [...new Set<Polity>(ns.map(n => n.suzerain || n))];
    }

    get vassalNeighbors(): Polity[] {
        const ns = new Set<Polity>();
        for (const p of [this, ...this.vassals]) {
            for (const n of p.neighbors) {
                if (n !== this) ns.add(n);
            }
        }
        return [...ns];
    }

    canAttack(other: Polity): [boolean, string] {
        switch (true) {
            case this === other: return [false, ''];
            case !!this.suzerain && other !== this.suzerain: return [false, "can't attack if a vassal"];
            case this.vassals.has(other): return [false, "can't attack a vassal"];
            case !this.vassalNeighbors.includes(other) && other !== this.suzerain: return [false, "too far to attack"];
            default: return [true, ''];
        }
    }
}

class PolityDef {
    constructor(readonly name: string, readonly mapColor: string) {}
}

const DEFAULT_POLITIES = [
    new PolityDef('A', 'red'),
    new PolityDef('B', 'orange'),
    new PolityDef('C', 'yellow'),
    new PolityDef('D', 'green'),
    new PolityDef('E', 'blue'),
    new PolityDef('F', 'purple'),
    new PolityDef('G', 'brown'),
    new PolityDef('H', 'grey'),
    new PolityDef('I', 'pink'),
    new PolityDef('J', 'lightblue'),
    new PolityDef('K', 'magenta'),
    new PolityDef('L', 'cyan'),
    new PolityDef('M', 'darkred'),
    new PolityDef('N', 'lightgreen'),
    new PolityDef('O', 'darkgreen'),
    new PolityDef('P', 'darkblue'),
    new PolityDef('Q', 'indigo'),
    new PolityDef('R', 'darkorange'),
    new PolityDef('S', 'tan'),
    new PolityDef('T', 'slateblue'),
    new PolityDef('U', 'violet'),
    new PolityDef('V', 'mediumseagreen'),
    new PolityDef('W', 'goldenrod'),
    new PolityDef('X', 'darkgrey'),
    new PolityDef('Y', 'lightgrey'),
];

const NAMED_DEFAULT_POLITIES = DEFAULT_POLITIES.map(
    (pd, index) => new PolityDef(cityNames[index], pd.mapColor));

export enum Produce {
    Barley,
    Lentils,
    Dairy,
}

type PerProduce = {
    [Produce.Barley]: number;
    [Produce.Lentils]: number;
    [Produce.Dairy]: number;
}

class Terrain {
    constructor(
        readonly landUnitsPerTile: PerProduce,
        readonly yieldFactor: PerProduce,
    ) {}
}

const Alluvium = new Terrain({
    [Produce.Barley]: 50000,
    [Produce.Lentils]: 50000,
    [Produce.Dairy]: 20000,
}, {
    [Produce.Barley]: 1.5,
    [Produce.Lentils]: 1.0,
    [Produce.Dairy]: 1.0,
});
const DryLightSoil = new Terrain({
    [Produce.Barley]: 50000,
    [Produce.Lentils]: 50000,
    [Produce.Dairy]: 5000,
}, {
    [Produce.Barley]: 0.5,
    [Produce.Lentils]: 0.8,
    [Produce.Dairy]: 1.0,
});
const Desert = new Terrain({
    [Produce.Barley]: 0,
    [Produce.Lentils]: 0,
    [Produce.Dairy]: 2500,
}, {
    [Produce.Barley]: 0,
    [Produce.Lentils]: 0,
    [Produce.Dairy]: 1.0,
});

class Allocation {
    constructor(
        readonly product: Produce,
        readonly terrain: Terrain,
        readonly land: number,
        readonly labor: number) {}

    production(): number {
        return this.terrain.yieldFactor[this.product] * this.ces_production(
            this.land * this.terrain.landUnitsPerTile[this.product], 
            this.labor);
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

function production(allocs: readonly Allocation[]): PerProduce {
    const total = {
        [Produce.Barley]: 0,
        [Produce.Lentils]: 0,
        [Produce.Dairy]: 0,
    };

    for (const alloc of allocs) {
        total[alloc.product] += alloc.production()
    }

    return total;
}

// For now, this is a Cobb-Douglas utility function with equal weights.
// - p is production
function capacity(p: PerProduce) {
    // Without barley is OK.
    if (p[Produce.Barley] === 0) {
        return 2 * Math.pow(p[Produce.Lentils] * p[Produce.Dairy], 1/2)
    }

    return 3 * Math.pow(p[Produce.Barley] * p[Produce.Lentils] * p[Produce.Dairy], 1/3);
}

export class Tile {
    private controller_: Polity;
    private tradePartners_= new Set<Tile>();

    private population_: number;
    private construction_: number;

    private dryLightSoilEnabled_ = false;

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
        this.population_ = this.isRiver ? randint(1000, 3000) : randint(80, 250);
        this.construction_ = Math.floor(0.1 * this.population_);
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

    get production(): PerProduce {
        const allocs = [
            new Allocation(Produce.Barley, Alluvium, this.wetFraction, this.population / 3),
            new Allocation(Produce.Lentils, DryLightSoil, this.dryLightSoilFraction, this.population / 3),
            new Allocation(Produce.Dairy, Desert, this.desertFraction, this.population / 3),
        ];
        const initialProduction = production(allocs);

        const initialCapacity = capacity(initialProduction);
        console.log(`* Production log for ${this.controller.name}`);
        console.log('Initial allocs', allocs);
        console.log('Initial production', initialProduction);
        console.log('Initial capacity', initialCapacity);
        const totalInitialProduction = initialProduction[Produce.Barley] + initialProduction[Produce.Lentils] + initialProduction[Produce.Dairy];
        console.log('Dietary efficiency', initialCapacity/totalInitialProduction);

        return initialProduction;
    }

    // For now, this is a Cobb-Douglas utility function with equal weights.
    get capacity() {
        return capacity(this.production);
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
        const r = this.population / this.capacity;
        const dp = Math.floor(0.4 * r * (1 - r) * this.population);
        this.population += dp;
    }

    enableDryLightSoil() {
        this.dryLightSoilEnabled_ = true;
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

class WorldMap {
    tiles: Tile[][];
  
    constructor(world: World, public readonly width: number, public readonly height: number, polities: ReadonlyArray<Polity>) {
        const jCenter = Math.floor((width - 1)/2);

        // Initialize tiles.
        this.tiles = [];
        for (let i = 0; i < height; i++) {
            this.tiles[i] = [];
            for (let j = 0; j < width; j++) {
                const polity = polities[i * width + j];
                
                const isRiver = 
                       i < height - 1 && Math.abs(j - jCenter) == 1 
                    || i == height - 1 && j == jCenter;

                
                const wetFraction = 0.01 * (isRiver
                    ? 10 + randint(10) + randint(10)
                    : 0)
                const dryLightSoilFraction = Math.random() * (1 - wetFraction);
                const capacityRatio = Math.random() * 0.3 + 0.5;
                this.tiles[i][j] = new Tile(world, i, j, polity, isRiver, wetFraction, dryLightSoilFraction, capacityRatio);
            }
        }
    }

    updatePopulations() {
        for (const t of this.tiles.flat()) {
            t.updatePopulation();
        }
    }
}

function test() {
    const N = 1000;
    const games_by_brain: {[key: string]: number} = {};
    const wins_by_brain: {[key: string]: number} = {};
    const wins_by_start: {[key: string]: number} = {};
    let turns = 0;
    
    for (let i = 0; i < N; ++i) {
        const w = new World();
        for (const p of w.polities) {
            games_by_brain[p.brain.tag] = 1 + (games_by_brain[p.brain.tag] || 0);
        }
        let guard = 1000;
        while (w.polities.length > 1 && guard > 0) {
            w.advance();
            ++turns;
            --guard;
        }
        if (w.polities.length > 1) debugger;
        wins_by_brain[w.polities[0].brain.tag] = 1 + (wins_by_brain[w.polities[0].brain.tag] || 0);
        wins_by_start[w.polities[0].name] = 1 + (wins_by_start[w.polities[0].name] || 0);
    }

    console.log(`Results from ${N} games:`);
    console.log(`  Average turns per game: ${(turns / N).toFixed(2)}`);
    console.log(`  Average win rate per brain:`);
    for (const brainTag of Object.keys(wins_by_brain)) {
        const winRate = wins_by_brain[brainTag] / games_by_brain[brainTag];
        console.log(`    ${brainTag}: ${winRate}`);
    }
    console.log(`  Average win rate per start location:`);
    for (const start of Object.keys(wins_by_start)) {
        const winRate = wins_by_start[start] / N;
        console.log(`    ${start}: ${winRate}`);
    }
}

//test();

function randint(a: number, b?: number) {
    if (b === undefined) {
        [a, b] = [0, a];
    }
    return a + Math.floor(Math.random() * (b - a));
}

function randelem<T>(elems: readonly T[]): T {
    return elems[randint(elems.length)];
}

function shuffled<T>(items: readonly T[]): T[] {
    const ws = [...items];
    const ss = [];
    while (ws.length) {
        const i = randint(ws.length);
        ss.push(...ws.splice(i, 1));
    }
    return ss;
}

export function sorted<T>(
    items: readonly T[], 
    keyFun: undefined|((item: T) => number)|((item: T) => string) = undefined) {
    const xs = [...items];
    if (keyFun === undefined) {
        xs.sort();
    } else {
        xs.sort((a, b) => {
            const [as, bs] = [keyFun(a), keyFun(b)];
            return as < bs ? -1 : bs < as ? 1 : 0;
        });
    }
    return xs;
}

export function argmax<T>(items: readonly T[], valueFun: (item: T) => number): [T|undefined, number] {
    let bestItem = undefined;
    let bestValue = undefined;
    for (const item of items) {
        const value = valueFun(item);
        if (bestValue === undefined || value > bestValue) {
            [bestItem, bestValue] = [item, value];
        }
    }
    return [bestItem, bestValue || 0];
}

function evolve() {
    const generations = 500;

    const brainPopulation = [];
    let brains = World.BRAINS;
    if (true) {
        for (let i = 0; i < 25; ++i) {
            brainPopulation.push(randelem(World.BRAINS));
        }
    } else {
        brains = [
            new BasicBrain('B', 0.75, 0.25),
            new DefensiveBrain('D', 0.75),
            new SubjectBrain('S', 0.75, 0.75),
        ];
        for (let i = 0; i < 8; ++i) {
            brainPopulation.push(brains[0]);
        }
        for (let i = 0; i < 9; ++i) {
            brainPopulation.push(brains[1]);
        }
        for (let i = 0; i < 8; ++i) {
            brainPopulation.push(brains[2]);
        }
    }

    for (let i = 0; i < generations; ++i) {
        console.log(`* Generation ${i}`);

        const w = new World();
        w.clearLocalControl();
        w.setBrains(shuffled(brainPopulation));

        while (w.polities.length > 1 && w.year < 1000) {
            w.advance();
        }

        const top = argmax(w.polities, p => p.population);
        const winner = randelem(w.polities).brain;
        console.log(`  winner = ${winner.tag}, duplicating`);
        const nonWinningIndices = [...brainPopulation.filter(b => b.tag != winner.tag).keys()];
        if (nonWinningIndices.length === 0) {
            console.log('  no other brain types');
        } else {
            const removed = brainPopulation.splice(randelem(nonWinningIndices), 1);
            console.log(`  removed ${removed[0].tag} to make room for clone of winner`);
            brainPopulation.push(winner.clone());
        }

        if (Math.random() < 0.1) {
            const nonWinningIndices = [...brainPopulation.filter(b => b.tag != winner.tag).keys()];
            if (nonWinningIndices.length !== 0) {
                const removed = brainPopulation.splice(randelem(nonWinningIndices), 1);
                const mutant = randelem(brains);
                console.log(`  removed ${removed[0].tag} to make room for random brain ${mutant.tag}`);
                brainPopulation.push(mutant);
            }    
        }


        console.log('  new population');
        const counts: {[key: string]: number} = {};
        for (const b of brainPopulation) {
            counts[b.tag] = 1 + (counts[b.tag] || 0);
        }
        for (const k of sorted(Object.keys(counts))) {
            console.log(`    ${k}: ${counts[k]}`);
        }
    }
}

//evolve();
