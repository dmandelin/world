import { Brain } from './agents/brains';
import { World } from './world';
import { cityNames } from './content';
import { Tile } from './tile';
import { sorted } from './lib';

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

export function totalPopulation(ps: readonly Polity[]) {
    return ps
        .map(p => p.population)
        .reduce((a, b) => a + b, 0);
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

export const NAMED_DEFAULT_POLITIES = DEFAULT_POLITIES.map(
    (pd, index) => new PolityDef(cityNames[index], pd.mapColor));
