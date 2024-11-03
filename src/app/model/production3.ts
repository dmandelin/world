// Notes
//
// * Initial food production
// 
// One point is that for now, we want to skip over details of local trade
// and treat all the food workers together. So we need them to retain some
// sort of identity so we can pool their production.
//
// Allocations: Since 0s tend to produce 0 utility, we'll start out with
// a plausible base allocation, then look for local improvements.

// Step 1: Initially allocate everyone to barley, see what happens.

import { Pop } from "./population";
import { Alluvium, Barley, Product, Terrain } from "./production";
import { Tile } from "./tile";

export class TileEconomy {
    constructor(readonly tile: Tile) {}

    readonly processes: Process[] = [];

    initializeAllocations() {
        // Initially allocate all available land and people to the one
        // existing process. Allocate land proportional to people.
        const acresAvailable = Tile.acres * this.tile.wetFraction;

        for (const pop of this.tile.pop.pops) {
            const workers = pop.n;
            const acres = Math.floor(acresAvailable * workers / this.tile.pop.n);
            const p = new AgriculturalProcess('Barley farming', Alluvium, Barley);
            this.processes.push(p);
            p.workers.set(pop, workers);
            p.terrainAcres += acres;
        }
    }
}

export class Process {
    // Display name.
    readonly name: string;

    // Number of workers from each pop.
    readonly workers = new Map<Pop, number>();

    // Type of terrain in use, if any.
    readonly terrain: Terrain | undefined = undefined;
    // Acres of terrain in use, if any.
    terrainAcres = 0;

    // Products being produced.
    readonly products = new Map<Product, number>();

    constructor(name: string, terrain: Terrain) {
        this.name = name;
        this.terrain = terrain;
    }
}

export class AgriculturalProcess extends Process {
    constructor(name: string, terrain: Terrain, readonly product: Product) {
        super(name, terrain);
        this.products.set(product, 0);
    }
}