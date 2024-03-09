import { Injectable } from "@angular/core";
import {Brain, BasicBrain, DefensiveBrain, NullBrain} from "./brains";
import { TemplateLiteral } from "@angular/compiler";

@Injectable({providedIn: 'root'})
export class World {
    private year_ = 0;
    private polities_ = DEFAULT_POLITIES.map((pd, i) => 
        new Polity(this, pd.name, pd.mapColor, randelem(World.BRAINS)));
    readonly map = new WorldMap(5, 5, this.polities);
    readonly log = new WorldLog();

    lastPopulation = new Map<Tile, number>();
    lastAttacks = new Set<[Polity, Polity]>();

    private watchers_: Set<Function> = new Set<Function>();

    constructor() {
        this.updateLastPopulation();
        this.recordRanks();
    }

    updateLastPopulation() {
        for (const tile of this.map.tiles.flat()) {
            this.lastPopulation.set(tile, tile.population);
        }
    }

    populationChange(tile: Tile): number {
        const last = this.lastPopulation.get(tile);
        if (last === undefined) return 0;
        return (tile.population - last) / last;
    }

    recordRanks() {
        let i = 1;
        for (const polity of this.getRankedPolities()) {
            polity.historicalRanks.push([this.year, i++]);
        }
    }

    static BRAINS = [
        new BasicBrain('A', 1.0),
        new DefensiveBrain('A/', 1.0),
        new BasicBrain('Na', 0.66),
        new DefensiveBrain('Na/', 0.66),
        new BasicBrain('N', 0.5),
        new DefensiveBrain('N/', 0.5),
        new BasicBrain('Np', 0.33),
        new DefensiveBrain('Np/', 0.33),
        new BasicBrain('P', 0.2),
        new DefensiveBrain('P/', 0.2),
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

    nextTurn() {
        this.updateLastPopulation();
        this.lastAttacks.clear();
        this.log.turnlogClear();

        this.map.updatePopulations();

        if (this.year == 200) {
            this.log.turnlog('Large-scale irrigation works begun!');
            for (const t of this.map.tiles.flat()) {
                t.enableDryLightSoil();
            }
        }

        // Compute what alliance exists against each potential aggressor.
        for (const p of this.polities) {
            p.counterAlliance = p.neighbors.filter(n => n.brain.joinsCounterAlliance(this, n, p));
        }

        for (const p of this.polities) {
            if (this.polities.includes(p)) {
                this.startTurnFor(p);
                this.log.turnlog(`${p.name}'s turn`)
                p.brain.move(this, p);
            }
        }

        this.year_ += 20;
        this.recordRanks();

        for (const w of this.watchers_) {
            w();
        }
    }

    startTurnFor(p: Polity) {
        p.attacked = false;
    }

    resolveAttack(attacker: Polity, target: Polity, defender: readonly Polity[]) {
        this.lastAttacks.add([attacker, target]);

        const ac = new Combatant([attacker, ...attacker.vassals]);
        const dc = new Combatant([...new Set(defender.flatMap(d => [d, ...d.vassals]))]);
        const ap = ac.power;
        const dp = dc.power;
        const winp = ap / (ap + dp);

        this.log.turnlog(`    AP = ${ap} (${ac.polities.map(p => p.name)})`);
        this.log.turnlog(`    DP = ${dp} (${dc.polities.map(p => p.name)})`);

        attacker.attacked = true;

        if (Math.random() < winp) {
            this.log.turnlog(`  Successful attack: ${attacker.name} takes over ${defender[0].name}`);
            for (const p of ac.polities) {
                this.losses(p, 0.01);
            }
            for (const p of dc.polities) {
                this.losses(p, 0.05);
            }
            this.vassalize(attacker, target);
        } else {
            this.log.turnlog(`  Failed attack`);
            for (const p of ac.polities) {
                this.losses(p, 0.05);
            }
            for (const p of dc.polities) {
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
            defender.suzerain = undefined;
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

class Combatant {
    constructor(public readonly polities: readonly Polity[]) {}

    get power(): number { 
        return this.polities
            .map(p => p.population)
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

    vassals: Set<Polity> = new Set<Polity>();
    suzerain: Polity|undefined = undefined;
    counterAlliance: readonly Polity[] = [];

    attacked: boolean = false;

    historicalRanks: [number, number][] = [];

    constructor(
        private readonly world: World, 
        readonly name: string,
        readonly mapColor: string,
        brain: Brain) {
        this.brain_ = brain;
    }

    counterAllianceDisplay(): string {
        if (this.counterAlliance.length === 0) return '';
        const names = this.counterAlliance.map(a => a.name).join(',');
        return `[vs ${names}: ${totalPopulation(this.counterAlliance)}]`;
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

    get vassalPopulation(): number {
        return [this, ...this.vassals]
            .map(p => p.population)
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

    get vassalNeighbors(): Polity[] {
        const ns = new Set<Polity>();
        for (const p of [this, ...this.vassals]) {
            for (const n of p.neighbors) {
                if (n !== this) ns.add(n);
            }
        }
        return [...ns];
    }

    canAttack(other: Polity): boolean {
        return this !== other && !this.suzerain && !this.vassals.has(other);
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

export class Tile {
    private controller_: Polity;
    private population_ = this.capacity;

    private dryLightSoilEnabled_ = false;

    constructor(
        public readonly i: number, 
        public readonly j: number, 
        controller: Polity,
        public readonly wetFraction: number,
        public readonly dryLightSoilFraction: number,
        capacityRatio: number,
        ) {
        this.controller_ = controller;
        this.population_ = Math.floor(this.capacity * capacityRatio);
    }

    get capacity() {
        const f = this.wetFraction +
                (this.dryLightSoilEnabled_ ? this.dryLightSoilFraction : 0);
        return Math.floor(f * 5000);
    }

    get controller() { return this.controller_; }
    set controller(value: Polity) { this.controller_ = value; }

    get population() { return this.population_; }
    set population(value: number) { this.population_ = value; }

    updatePopulation() {
        const r = this.population / this.capacity;
        const dp = Math.floor(0.4 * r * (1 - r) * this.population);
        this.population += dp;
    }

    enableDryLightSoil() {
        this.dryLightSoilEnabled_ = true;
    }
}

class WorldMap {
    tiles: Tile[][];
  
    constructor(public readonly width: number, public readonly height: number, polities: ReadonlyArray<Polity>) {
        // Initialize tiles.
        this.tiles = [];
        for (let i = 0; i < height; i++) {
            this.tiles[i] = [];
            for (let j = 0; j < width; j++) {
                const polity = polities[i * width + j];
                const wetFraction = randint(1, 10) * 0.1;
                const dryLightSoilFraction = Math.random() * (1 - wetFraction);
                const capacityRatio = Math.random() * 0.2 + 0.4;
                this.tiles[i][j] = new Tile(i, j, polity, wetFraction, dryLightSoilFraction, capacityRatio);
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
            w.nextTurn();
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

function sorted<T>(items: readonly T[], keyFun: undefined|((item: T) => number) = undefined) {
    const xs = [...items];
    if (keyFun === undefined) {
        xs.sort();
    } else {
        xs.sort((a, b) => keyFun(a) - keyFun(b));
    }
    return xs;
}

function evolve() {
    const generations = 500;

    const brainPopulation = [];
    if (true) {
        for (let i = 0; i < 25; ++i) {
            brainPopulation.push(randelem(World.BRAINS));
        }
    } else {
        for (let i = 0; i < 22; ++i) {
            brainPopulation.push(new DefensiveBrain('D', 1.0));
        }
        for (let i = 0; i < 3; ++i) {
            brainPopulation.push(new BasicBrain('A', 1.0, 1.0));
        }
    }

    for (let i = 0; i < generations; ++i) {
        console.log(`* Generation ${i}`);

        const w = new World;
        w.setBrains(shuffled(brainPopulation));

        while (w.polities.length > 1 && w.year < 1000) {
            w.nextTurn();
        }

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

        if (Math.random() < 0.5) {
            const nonWinningIndices = [...brainPopulation.filter(b => b.tag != winner.tag).keys()];
            if (nonWinningIndices.length !== 0) {
                const removed = brainPopulation.splice(randelem(nonWinningIndices), 1);
                console.log(`  removed ${removed[0].tag} to make room for random brain`);
                brainPopulation.push(randelem(World.BRAINS));
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
