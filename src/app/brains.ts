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
    acceptsAlly(roll: number): boolean;
    clone(): Brain;
    move(world: World, self: Polity): void;
}

const BASIC_BRAIN_DEFS: readonly [string, number, number][] = [
    ['A', 1.0, 0.0],
    ['R', 0.5, 0.1],
    ['N', 0.5, 0.5],
    ['T', 0.1, 0.5],
    ['P', 0.1, 0.9],
    ['I', 0.1, 0.1],
];

export class BasicBrain {
    constructor(
        readonly tag = '?', 
        readonly attackProbability: number = 0.2, 
        readonly allyProbability: number = 0.2) {
        
        if (attackProbability + allyProbability > 1.0) {
            throw 'probabilities sum to more than 1';
        }
    }

    static random(): BasicBrain {
        return new BasicBrain(...randelem(BASIC_BRAIN_DEFS));
    }

    acceptsAlly(roll: number): boolean {
        return roll < this.allyProbability;
    }

    clone(): BasicBrain {
        return new BasicBrain(this.tag, this.attackProbability);
    }

    move(world: World, self: Polity): void {
        if (VERBOSE) console.log(`* Brain move(${self.name})`);

        const roll = Math.random();
        if (roll < this.attackProbability) {
            const ns = self.neighbors;
            if (VERBOSE) console.log(`  Neighbors: ${ns.map(n => n.name)}`);
    
            const target = ns[Math.floor(Math.random() * ns.length)];
            if (VERBOSE) console.log(`  Attacking ${target.name}`);
            world.resolveAttack(self, target);
            return;
        }

        if (VERBOSE) console.log('  Recovering.\n');
        world.recover(self);

        if (roll < this.attackProbability + this.allyProbability && !self.hasAllies()) {
            const ns = self.neighbors.filter(n => !n.hasAllies());
            if (ns.length) {
                if (VERBOSE) console.log(`  Neighbors: ${ns.map(n => n.name)}`);
        
                const potentialAlly = ns[Math.floor(Math.random() * ns.length)];
                if (potentialAlly.brain.acceptsAlly(roll - this.attackProbability)) {
                    if (VERBOSE) console.log(`  Allying with ${potentialAlly.name}`);
                    world.resolveAlliance(self, potentialAlly);    
                }
            }
        }
        return;
    }
}

