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

import { Output } from "@angular/core";
import { Factor } from "../data/calc";
import { CESMPLaborExpOneHalf, CESMPLandExpOneHalf, CESProductionExpOneHalf } from "../data/ces";
import { assert, sum } from "./lib";
import { Pop, Roles } from "./population";
import { Alluvium, Barley, Lentils, Product, Terrain } from "./production";
import { Tile } from "./tile";
import { marginalNutrition } from "./utility";

export class TileEconomy {
    constructor(readonly tile: Tile) {}

    readonly processes: Process[] = [];
    unemployed: number = 0;

    initializeAllocations() {
        // Initially allocate all available land and people to the few
        // existing processes. Allocate land proportional to people.
        const acresAvailable = Tile.acres * this.tile.wetFraction;

        const totalWorkers = this.tile.pop.workers;
        for (const pop of this.tile.pop.pops) {
            const workers = pop.workers;
            const acres = Math.floor(acresAvailable * workers / totalWorkers);

            const barleyAcres = Math.floor(acres * 0.8);
            const barleyWorkers = Math.floor(workers * 0.8);
            const lentilsAcres = acres - barleyAcres;
            const lentilsWorkers = workers - barleyWorkers;

            const pb = new AgriculturalProcess(this.tile, {
                name: 'Barley farming',
                terrain: Alluvium,
                product: Barley,
                baseAcresPerWorker: 10,
                baseOutput: 5,
            });
            this.processes.push(pb);
            pb.workers.set(pop, barleyWorkers);
            pb.acres = barleyAcres;

            const pl = new AgriculturalProcess(this.tile, {
                name: 'Lentil farming',
                terrain: Alluvium,
                product: Lentils,
                baseAcresPerWorker: 7,
                baseOutput: 2.5,
            });
            this.processes.push(pl);
            pl.workers.set(pop, lentilsWorkers);
            pl.acres = lentilsAcres;
        }
    }

    update() {
        this.processes.splice(0, this.processes.length);
        this.initializeAllocations();

        for (const p of this.processes) {
            p.update();
        }

        this.unemployed = this.tile.pop.workers - sum([...this.processes.map(p => sum([...p.workers.values()]))]);
    }

    apply() {
        for (const p of this.processes) {
            assert(p.workers.size === 1);
            const pop = [...p.workers.keys()][0];
            assert(p.products.size === 1);
            const product = [...p.products.keys()][0];
            const output = p.products.get(product)!;
            pop.consumption.addProduction(product, output);
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
    acres = 0;

    // Products being produced.
    readonly products = new Map<Product, number>();

    // Output report details.
    outputDetails: OutputDetails = new OutputDetails();

    constructor(name: string, tile: Tile, terrain: Terrain) {
        this.name = name;
        this.tile = tile;
        this.terrain = terrain;
    }

    update() {}
}

class OutputDetails {
    constructor(values?: Pick<OutputDetails, keyof OutputDetails>) {
        if (values) Object.assign(this, values);
    }

    mods: Factor = new Factor(1);

    apk: number = 0;
    mpk: number = 0;

    apl: number = 0;
    mpl: number = 0;
};

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
        const mods = this.tile.outputFactor(this.traits.product).clone();
        if ([...this.workers.keys()].every(pop => pop.role === Roles.EminentFamilies)) {
            mods.apply('Eminent Families', 2);
        }
        const modifiedBaseOutput = this.traits.baseOutput * mods.value;
        
        // Update output.
        const workers = sum([...this.workers.values()]);
        const output = CESProductionExpOneHalf(
            0.6, 0.4, this.traits.baseAcresPerWorker, modifiedBaseOutput, 
            workers, 
            this.acres);
        const intOutput = Math.floor(output);
        this.products.set(this.traits.product, intOutput);

        // Update output details.
        const mpk =  CESMPLandExpOneHalf(
            0.6, 0.4, this.traits.baseAcresPerWorker, modifiedBaseOutput, workers, this.acres)
        this.outputDetails = new OutputDetails({
            mods,
            apk: output / this.acres,
            mpk,
            apl: output / workers,
            mpl: CESMPLaborExpOneHalf(
                0.6, 0.4, this.traits.baseAcresPerWorker, modifiedBaseOutput, workers, this.acres)
        });
    }
}