import { Injectable } from "@angular/core";
import {Brain, BasicBrain, DefensiveBrain, NullBrain} from "./brains";
import { TemplateLiteral } from "@angular/compiler";

@Injectable({providedIn: 'root'})
export class World {
    private year_ = 0;
    private polities_ = DEFAULT_POLITIES.map((pd, i) => 
        new Polity(this, pd.name, pd.mapColor, new NullBrain()));
    readonly map = new WorldMap(5, 5, this.polities);

    constructor() {}

    static BRAINS = [
        new BasicBrain('A', 1.0),
        new DefensiveBrain('E', 1.0),
        new BasicBrain('R', 0.5),
        new DefensiveBrain('D', 0.5),
        new BasicBrain('I', 0.2),
        new DefensiveBrain('P', 0.2),
    ];

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
        //console.log('-------------------------------------------------');

        this.map.scaleCapacity(1.04);
        this.map.updatePopulations();

        // Compute what alliance exists against each potential aggressor.
        for (const p of this.polities) {
            p.counterAlliance = p.neighbors.filter(n => n.brain.joinsCounterAlliance(this, n, p));
        }

        for (const p of this.polities) {
            if (this.polities.includes(p)) {
                p.brain.move(this, p);
            }
        }

        this.year_ += 20;
    }

    resolveAttack(attacker: Polity, target: Polity, defender: readonly Polity[]) {
        const ac = new Combatant([attacker]);
        const dc = new Combatant(defender);
        const ap = ac.power;
        const dp = dc.power;
        const winp = ap / (ap + dp);

        if (Math.random() < winp) {
            //console.log(`  Successful attack: ${attacker.name} takes over ${defender.name}`);
            this.losses(attacker, 0.1);
            for (const p of dc.polities) {
                this.losses(p, 0.2);
            }
            this.takeover(attacker, target);
        } else {
            this.losses(attacker, 0.2);
            for (const p of dc.polities) {
                this.losses(p, 0.1);
            }
            //console.log(`  Failed attack`);
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

    recover(polity: Polity) {
        for (const tile of this.map.tiles.flat()) {
            if (tile.controller == polity) {
                tile.population += 100;
                if (tile.population > 1000) {
                    tile.population = 1000;
                }
            }
        }
    }
    
    getRankedPolities(): Polity[] {
        return [...this.polities].sort((a, b) => {
            const popDiff = b.population - a.population;
            if (popDiff) return popDiff;
            if (a.name < b.name) return -1;
            if (b.name < a.name) return 1;
            return 0;
        })
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

    counterAlliance: readonly Polity[] = [];

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

class Tile {
    private controller_: Polity;
    private population_ = this.capacity;

    constructor(public capacity: number, controller: Polity) {
        this.controller_ = controller;
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
}
  
class WorldMap {
    tiles: Tile[][];
  
    constructor(public readonly width: number, public readonly height: number, polities: ReadonlyArray<Polity>) {
        // Initialize tiles.
        this.tiles = [];
        for (let i = 0; i < height; i++) {
            this.tiles[i] = [];
            for (let j = 0; j < width; j++) {
                this.tiles[i][j] = new Tile(500, polities[i * width + j])
            }
        }

        // Randomly distribute additional carrying capacity and initial population.
        let cap = 1500 * width * height;
        const chunk = 500;
        while (cap > 0) {
            const t = this.tiles[randint(width)][randint(height)];
            t.capacity += chunk;
            t.population = t.capacity;
            cap -= chunk;
        }
    }

    scaleCapacity(f: number) {
        for (const t of this.tiles.flat()) {
            t.capacity = Math.floor(t.capacity * f);
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

function randint(a: number) {
    return Math.floor(Math.random() * a);
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

function evolve() {
    const generations = 200;

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

        let guard = 1000;
        while (w.polities.length > 1 && guard > 0) {
            w.nextTurn();
            --guard;
        }
        if (w.polities.length > 1) debugger;

        const winner = w.polities[0].brain;
        console.log(`  winner = ${winner.tag}, duplicating`);
        const nonWinningIndices = [...brainPopulation.filter(b => b.tag != winner.tag).keys()];
        if (nonWinningIndices.length === 0) {
            console.log('  no other brain types');
        } else {
            const removed = brainPopulation.splice(randelem(nonWinningIndices), 1);
            console.log(`  removed ${removed[0].tag}`);
            brainPopulation.push(winner.clone());
        }

        console.log('  new population');
        const counts: {[key: string]: number} = {};
        for (const b of brainPopulation) {
            counts[b.tag] = 1 + (counts[b.tag] || 0);
        }
        for (const k in counts) {
            console.log(`    ${k}: ${counts[k]}`);
        }
    }
}

//evolve();
