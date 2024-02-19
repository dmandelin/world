import {World, Polity} from "./world";


export interface Brain {
    move(world: World, self: Polity): void;
}

export class BasicBrain {
    move(world: World, self: Polity): void {
        console.log(`* Brain move(${self.name})`);

        if (Math.random() < 0.8) {
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

