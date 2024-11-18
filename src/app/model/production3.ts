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
import { CESMPLaborExpOneHalf, CESMPLandExpOneHalf, CESProductionExpOneHalf } from "../data/ces";
import { argmax, assert, divide, sum } from "./lib";
import { Pop, Roles } from "./population";
import { Alluvium, Barley, Dairy, Desert, DryLightSoil, Lentils, Product, Terrain } from "./production";
import { Tile } from "./tile";

const BASE_PROCESSES = [
    {
        name: 'Barley farming',
        terrain: Alluvium,
        product: Barley,
        baseAcresPerWorker: 10,
        baseOutput: 5,
    },
    {
        name: 'Lentil farming',
        terrain: Alluvium,
        product: Lentils,
        baseAcresPerWorker: 7,
        baseOutput: 2.5,
    },
    {
        name: 'Herding',
        terrain: DryLightSoil,
        product: Dairy,
        baseAcresPerWorker: 100,
        baseOutput: 5,
    },
    /*{
        name: 'Herding',
        terrain: Desert,
        product: Dairy,
        baseAcresPerWorker: 400,
        baseOutput: 4,
    },*/
]

export class TileEconomy {
    constructor(readonly tile: Tile) {}

    readonly processes: Process[] = [];
    readonly processesByPop: Map<Pop, Process[]> = new Map();
    unemployed: number = 0;

    readonly messages: string[] = [];

    initializeAllocations() {
        const totalWorkers = this.tile.pop.workers;
        for (const pop of this.tile.pop.pops) {
            const workers = pop.workers;

            const processes = BASE_PROCESSES
                .filter(t => this.tile.acresOf(t.terrain) > 0)
                .map(t => new AgriculturalProcess(this.tile, t));

            // Allocate workers equally.
            const workerAllocations = divide(workers, processes.length);
            for (const [i, p] of processes.entries()) {
                processes[i].workers.set(pop, workerAllocations[i]);
            }

            // Collect processes by terrain type and allocate equally.
            const processesByTerrain = new Map<Terrain, AgriculturalProcess[]>();
            for (const p of processes) {
                const terrain = p.terrain!;
                processesByTerrain.set(terrain, [...(processesByTerrain.get(terrain) || []), p]);
            }
            for (const [terrain, ps] of processesByTerrain.entries()) {
                const acres = Math.floor(this.tile.acresOf(terrain) * workers / totalWorkers);
                const landAllocations = divide(acres, ps.length);
                for (const [i, p] of ps.entries()) {
                    ps[i].acres = landAllocations[i];
                }
            }

            // Register the processes.
            for (const p of processes) {
                this.addProcess(p);
            }
        }
    }

    private addProcess(p: Process) {
        this.processes.push(p);
        for (const pop of p.workers.keys()) {
            this.processesByPop.set(pop, [...(this.processesByPop.get(pop) || []), p]);
        }
    }

    reallocate() {
        for (const pop of this.tile.pop.pops) {
            for (let i = 0; i < 10; ++i) {
                let changed = false;
                changed = this.reallocateLaborOneStep(pop) || changed;
                for (const t of [Alluvium, DryLightSoil]) {
                    changed = this.reallocateLandOneStep(pop, t) || changed;
                }
                if (!changed) break;
            }
        }
    }

    reallocateAllOneStep() {
        for (const pop of this.tile.pop.pops) {
            this.reallocateLaborOneStep(pop, true);
        }
        for (const pop of this.tile.pop.pops) {
            for (const t of [Alluvium, DryLightSoil]) {
                this.reallocateLandOneStep(pop, t, true);
            }
        }
    }

    reallocateLaborOneStep(pop: Pop, verbose = false): boolean {
        if (verbose) this.messages.push(`Reallocating ${pop.role.name} workers`);

        const processes = this.processesByPop.get(pop);
        assert(processes);
        const [best, bestMul] = argmax(processes, p => p.outputDetails.mul); 
        const [worst, worstMul] = argmax(processes, p => -p.outputDetails.mul);

        if (!best || !worst) return false;
        if (bestMul >= worstMul * 1.05) {
            // Try moving 10% of workers from worst to best.
            const initialUtility = pop.consumption.nutrition.value;
            const workersToMove = Math.min(Math.floor(pop.workers * 0.1), worst.workers.get(pop)!);
            
            if (verbose) this.messages.push(`Moving ${workersToMove} workers from ${worst.name} to ${best.name}`);
            worst.workers.set(pop, worst.workers.get(pop)! - workersToMove);
            best.workers.set(pop, best.workers.get(pop)! + workersToMove);
            this.reapplyProcess(worst);
            this.reapplyProcess(best);
            pop.consumption.refresh();
            const finalUtility = pop.consumption.nutrition.value;
            if (finalUtility <= initialUtility) {
                if (verbose) this.messages.push(`Reverting move: ${finalUtility.toFixed(1)} <= ${initialUtility.toFixed(1)}`);
                // Undo the move.
                worst.workers.set(pop, worst.workers.get(pop)! + workersToMove);
                best.workers.set(pop, best.workers.get(pop)! - workersToMove);
                this.reapplyProcess(worst);
                this.reapplyProcess(best);
                pop.consumption.refresh();
                worst.postUpdate();
                best.postUpdate();
                return false;
            } else {
                if (verbose) this.messages.push(`Confirming move: ${finalUtility.toFixed(1)} > ${initialUtility.toFixed(1)}`);
                worst.postUpdate();
                best.postUpdate();
                return true;
            }   
        }
        return false;
    }

    reallocateLandOneStep(pop: Pop, terrain: Terrain, verbose = false): boolean {
        const processes = this.processesByPop.get(pop)!.filter(p => p.terrain === terrain);
        if (processes.length <= 1) return false;
        if (verbose) this.messages.push(`Reallocating ${pop.role.name} land in ${terrain.name}`);

        const [best, bestMuk] = argmax(processes, p => p.outputDetails.muk); 
        const [worst, worstMuk] = argmax(processes, p => -p.outputDetails.muk);

        if (!best || !worst) return false;
        if (bestMuk >= worstMuk * 1.05) {
            if (!worst.terrain) return false;

            // Try moving 10% of acres from worst to best.
            const initialUtility = pop.consumption.nutrition.value;
            const acresToMove = Math.min(Math.floor(this.tile.acresOf(worst.terrain) * 0.05), worst.acres);
            if (verbose) this.messages.push(`Moving ${acresToMove} acres from ${worst.name} to ${best.name}`);     

            worst.acres -= acresToMove;
            best.acres += acresToMove;
            this.reapplyProcess(worst);
            this.reapplyProcess(best);
            pop.consumption.refresh();
            const finalUtility = pop.consumption.nutrition.value;
            if (finalUtility <= initialUtility) {
                // Undo the move.
                worst.acres += acresToMove;
                best.acres -= acresToMove;
                this.reapplyProcess(worst);
                this.reapplyProcess(best);
                pop.consumption.refresh();
                worst.postUpdate();
                best.postUpdate();
                if (verbose) this.messages.push(`Reverting move: ${finalUtility.toFixed(1)} <= ${initialUtility.toFixed(1)}`);
                return false;
            } else {
                worst.postUpdate();
                best.postUpdate();
                if (verbose) this.messages.push(`Confirming move: ${finalUtility.toFixed(1)} > ${initialUtility.toFixed(1)}`);
                return true;
            }   
        }
        return false;
    }

    update() {
        this.messages.splice(0, this.messages.length);
        this.processes.splice(0, this.processes.length);
        this.processesByPop.clear();
        this.initializeAllocations();

        for (const p of this.processes) {
            p.update();
        }

        this.unemployed = this.tile.pop.workers - sum([...this.processes.map(p => sum([...p.workers.values()]))]);
    }

    postUpdate() {
        for (const p of this.processes) {
            p.postUpdate();
        }
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

    private reapplyProcess(p: Process) {
        p.update();
        
        assert(p.workers.size === 1);
        const pop = [...p.workers.keys()][0];
        assert(p.products.size === 1);
        const product = [...p.products.keys()][0];
        const output = p.products.get(product)!;
        pop.consumption.setItemProduction(product, output);
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
    postUpdate() {}
}

class OutputDetails {
    constructor(values?: Pick<OutputDetails, keyof OutputDetails>) {
        if (values) Object.assign(this, values);
    }

    mods: Factor = new Factor(1);

    apk: number = 0;
    mpk: number = 0;
    muk: number = 0;

    apl: number = 0;
    mpl: number = 0;
    mul: number = 0;
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
            muk: 0,
            apl: output / workers,
            mpl: CESMPLaborExpOneHalf(
                0.6, 0.4, this.traits.baseAcresPerWorker, modifiedBaseOutput, workers, this.acres),
            mul: 0,
        });
    }

    override postUpdate() {
        // Update marginal utilities now that we have utility data.
        assert(this.workers.size === 1);
        const pop = [...this.workers.keys()][0];
        assert(this.products.size === 1);
        const product = [...this.products.keys()][0];

        const mu = pop.consumption.marginalUtility(product);
        this.outputDetails.muk = this.outputDetails.mpk * mu;
        this.outputDetails.mul = this.outputDetails.mpl * mu;
    }
}