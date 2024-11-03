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

import { Factor } from "../data/calc";
import { CESProductionExpOneHalf } from "../data/ces";
import { sum } from "./lib";
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
            const workersAndDependents = pop.n;
            const acres = Math.floor(acresAvailable * workersAndDependents / this.tile.pop.n);
            const workers = Math.round(0.25 * workersAndDependents);
            const p = new AgriculturalProcess(this.tile, {
                name: 'Barley farming',
                terrain: Alluvium,
                product: Barley,
                baseAcresPerWorker: 10,
                baseOutput: 5,
            });
            this.processes.push(p);
            p.workers.set(pop, workers);
            p.terrainAcres += acres;
        }
    }

    update() {
        for (const p of this.processes) {
            p.update();
        }
    }
}

export class Process {
    // Display name.
    readonly name: string;

    // Tile.
    readonly tile: Tile;

    // Number of workers from each pop.
    readonly workers = new Map<Pop, number>();

    // Type of terrain in use, if any.
    readonly terrain: Terrain | undefined = undefined;
    // Acres of terrain in use, if any.
    terrainAcres = 0;

    // Products being produced.
    readonly products = new Map<Product, number>();

    // # Output report details.
    // Output modifier factor.
    outputFactor: Factor = new Factor();

    constructor(name: string, tile: Tile, terrain: Terrain) {
        this.name = name;
        this.tile = tile;
        this.terrain = terrain;
    }

    update() {}
}

class AgriculturalProcessTraits {
    constructor(
        readonly name: string, 
        readonly terrain: Terrain, 
        readonly product: Product,
        readonly baseAcresPerWorker: number = 1, 
        readonly baseOutput: number = 1) {}
}

export class AgriculturalProcess extends Process {
    constructor(tile: Tile, readonly traits: AgriculturalProcessTraits) {
        super(traits.name, tile, traits.terrain);
        this.products.set(traits.product, 0);
    }

    override update() {
        // Update modifiers.
        this.outputFactor = this.tile.outputFactor(this.traits.product);
        const modifiedBaseOutput = this.traits.baseOutput * this.outputFactor.value;
        
        // Update output.
        const output = CESProductionExpOneHalf(
            0.6, 0.4, this.traits.baseAcresPerWorker, modifiedBaseOutput, 
            sum([...this.workers.values()]), 
            this.terrainAcres);
        const intOutput = Math.floor(output);
        this.products.set(this.traits.product, intOutput);
    }
}