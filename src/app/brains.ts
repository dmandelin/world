import {World, Polity} from "./world";

const VERBOSE = true;

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

    doAttack(world: World, self: Polity, target: Polity): void;
}

const BASIC_BRAIN_DEFS: readonly [string, number, number][] = [
    ['A', 1.0, 0.0],
    ['U', 1.0, 1.0],
    ['N', 0.5, 0.5],
    ['D', 0.1, 1.0],
    ['P', 0.1, 0.5],
    ['I', 0.1, 0.1],
];

export class NullBrain {
    constructor(readonly tag = '.') {}

    clone(): NullBrain {
        return new NullBrain(this.tag);
    }

    joinsCounterAlliance(world: World, self: Polity, other: Polity): boolean {
        return false;
    }

    move(world: World, self: Polity): void {
    }
}

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
        const roll = Math.random();
        if (roll < this.attackProbability) {
            const ns = self.vassalNeighbors;

            const possibleTargets = ns.filter(n => self.canAttack(n));
            if (possibleTargets.length === 0) return;
            if (VERBOSE) world.log.turnlog(`  Neighbors: ${possibleTargets.map(n => n.name)}`);

            const target = randelem(possibleTargets);
            this.doAttack(world, self, target);
            return;
        }
    }

    doAttack(world: World, self: Polity, target: Polity) {
        if (VERBOSE) world.log.turnlog(`  Attacking ${target.name}`);
        if (VERBOSE) world.log.turnlog(`    Counteralliance: ${self.counterAllianceDisplay()}`)
        
        const defender = self.counterAlliance.includes(target)
            ? self.counterAlliance
            : [target];
        if (VERBOSE && defender.length > 1) {
            world.log.turnlog(`  Defender has alliance: ${self.counterAllianceDisplay()}`)
        }
        world.resolveAttack(self, target, defender);
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