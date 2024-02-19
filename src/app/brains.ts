import {World, Polity} from "./world";

export interface Brain {
    readonly tag: string;
    move(world: World, self: Polity): void;
}

export class BasicBrain {
    constructor(readonly tag = '?', readonly attackProbability: number = 0.2) {}

    static random() {
        switch (Math.floor(Math.random() * 4)) {
            case 0: return new BasicBrain('A', 0.5);
            case 1: return new BasicBrain('B', 0.2);
            case 2: return new BasicBrain('H', 1.0);
            default: return new BasicBrain('P', 0.1);
        }
    }

    move(world: World, self: Polity): void {
        console.log(`* Brain move(${self.name})`);

        if (Math.random() >= this.attackProbability) {
            console.log('  Recovering.\n');
            world.recover(self);
            return;
        }

        const ns = self.neighbors;
        console.log(`  Neighbors: ${ns.map(n => n.name)}`);

        const target = ns[Math.floor(Math.random() * ns.length)];
        console.log(`  Attacking ${target.name}`);
        world.resolveAttack(self, target);
    }
}

