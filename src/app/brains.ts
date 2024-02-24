import {World, Polity} from "./world";

const VERBOSE = false;

function randint(a: number) {
    return Math.floor(Math.random() * a);
}

function randelem<T>(elems: readonly T[]): T {
    return elems[randint(elems.length)];
}

export interface Brain {
    readonly tag: string;
    clone(): Brain;
    joinsCounterAlliance(world: World, self: Polity, other: Polity): boolean
    move(world: World, self: Polity): void;
}

const BASIC_BRAIN_DEFS: readonly [string, number, number][] = [
    ['A', 1.0, 0.0],
    ['U', 1.0, 1.0],
    ['N', 0.5, 0.5],
    ['D', 0.1, 1.0],
    ['P', 0.1, 0.5],
    ['I', 0.1, 0.1],
];

export class BasicBrain {
    constructor(
        readonly tag = '?', 
        readonly attackProbability: number = 0.2, 
        readonly allyProbability: number = 0.2) {}

    static random(): BasicBrain {
        return new BasicBrain(...randelem(BASIC_BRAIN_DEFS));
    }

    clone(): BasicBrain {
        return new BasicBrain(this.tag, this.attackProbability);
    }

    joinsCounterAlliance(world: World, self: Polity, other: Polity): boolean {
        return Math.random() < this.allyProbability;
    }

    move(world: World, self: Polity): void {
        if (VERBOSE) console.log(`* Brain move(${self.name})`);

        const roll = Math.random();
        if (roll < this.attackProbability) {
            const ns = self.neighbors;
            if (VERBOSE) console.log(`  Neighbors: ${ns.map(n => n.name)}`);

            const target = ns[Math.floor(Math.random() * ns.length)];
            if (VERBOSE) console.log(`  Attacking ${target.name}`);
            if (VERBOSE) console.log(`    Counteralliance: ${self.counterAllianceDisplay()}`)
            
            const defender = self.counterAlliance.includes(target)
                ? self.counterAlliance
                : [target];
            if (VERBOSE && defender.length > 1) {
                console.log(`  Defender has alliance: ${self.counterAllianceDisplay()}`)
            }
            world.resolveAttack(self, target, defender);
            return;
        }

        if (VERBOSE) console.log('  Recovering.\n');
        world.recover(self);
    }
}

export class DefensiveBrain extends BasicBrain {
    override joinsCounterAlliance(world: World, self: Polity, other: Polity): boolean {
        if (other.brain instanceof BasicBrain) {
            return other.brain.attackProbability >= this.attackProbability;
        }
        return true;
    }
}