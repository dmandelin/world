import {World, Polity} from "./world";


export interface Brain {
    move(world: World, self: Polity): void;
}

export class BasicBrain {
    move(world: World, self: Polity): void {
        console.log(`* Brain move(${self.name})`);
        const ns = self.neighbors;
        console.log(`  my neighbors: ${ns.map(n => n.name)}`);

        console.log('Doing nothing.\n');
    }
}

