import { Factor } from "../data/calc";
import { CESMPLaborExpOneHalf, CESMPLandExpOneHalf, CESProductionExpOneHalf } from "../data/ces";
import { argmax, argmin } from "./lib";
import { Pop, Role, Roles } from "./population";
import { Alluvium, Barley, Dairy, Desert, DryLightSoil, Lentils, Product, Terrain } from "./production";
import { Tile } from "./tile";
import { marginalNutrition, Nutrition2, nutrition } from "./utility";

class Pool<P extends Process2> {
    readonly allocs: Map<P, number>;

    constructor(readonly tile: Tile, readonly processes: P[], initialProcess: P) {
        this.allocs = new Map(processes.map(p => [p, p === initialProcess ? 1 : 0]));
    }

    allocEqual() {
        const n = this.processes.length;
        for (const p of this.processes) {
            this.allocs.set(p, 1 / n);
        }
    }
}

class LaborPool extends Pool<Process2> {
    constructor(readonly pop: Pop, processes: Process2[]) {
        super(
            pop.tile, 
            processes.filter(p => p.canBeWorkedBy(pop)), 
            processes.find(p => p instanceof LeisureProcess && p.canBeWorkedBy(pop))!);
    }

    get workers() {
        return Math.floor(0.25 * this.pop.n);
    }

    apply() {
        const n = this.workers;
        for (const [p, f] of this.allocs) {
            // TODO - send the extras somewhere.
            const na = Math.floor(f * n);
            p.workers += na;
            if (p.workerPop && p.workerPop !== this.pop) {
                throw `Worker pop mismatch: ${p.workerPop.role.name} vs ${this.pop.role.name}`;
            }
            p.workerPop = this.pop;
        }
    }

    realloc(p0: Process2, p1: Process2, fraction: number) {
        const f0 = this.allocs.get(p0)!;
        const f1 = this.allocs.get(p1)!;
        if (f0 < fraction) return;
        this.allocs.set(p0, f0 - fraction);
        this.allocs.set(p1, f1 + fraction);
        p0.workers -= Math.floor(fraction * this.workers);
        p1.workers += Math.floor(fraction * this.workers);
        p0.apply();
        p1.apply();
    }
}

class LandPool extends Pool<LandProcess2> {
    constructor(tile: Tile, readonly terrain: Terrain, processes: LandProcess2[], initialProcess: LandProcess2) {
        super(tile, processes.filter(p => p.canUse(terrain)), initialProcess);
    }

    get acres() {
        return this.tile.acresOf(this.terrain);
    }

    apply() {
        const a = this.acres;
        for (const [p, f] of this.allocs) {
            // TODO - send the extras somewhere.
            const na = Math.floor(f * a);
            p.acres += na;
        }
    }    

    realloc(p0: LandProcess2, p1: LandProcess2, fraction: number) {
        const f0 = this.allocs.get(p0)!;
        const f1 = this.allocs.get(p1)!;
        if (f0 < fraction) return;
        this.allocs.set(p0, f0 - fraction);
        this.allocs.set(p1, f1 + fraction);
        p0.acres -= Math.floor(fraction * this.acres);
        p1.acres += Math.floor(fraction * this.acres);
        p0.apply();
        p1.apply();
    }
}

abstract class Process2 {
    abstract get name(): string;

    // Number of people working on this process.
    workers = 0;

    // Pop that supplied the workers and will collect the output.
    workerPop: Pop|undefined;

    // Quantity of output.
    output = 0;

    // Factor by which output is modified, accounting for all factors.
    outputFactor: Factor = new Factor(1);

    canUse(terrain: Terrain) { return false; }
    canBeWorkedBy(pop: Pop) { return false; }
    get product(): Product|undefined { return undefined; }
    get roleName(): string { return this.workerPop?.role.name || '-'; }

    reset() { this.workers = 0; }
    apply() { this.output = 0; }

    get acresDisplay() { return ''; }
    get terrainDisplay() { return 'Settlement'; }
    get acresPerWorkerDisplay() { return ''; }
    get outputDisplay() { return this.output.toFixed(0); }
    get productDisplay() { return ''; }

    get apk() { return 0; }
    get mpk() { return 0; }
    get mpk2() { return 0; }
    muk(consumption: Map<Product, number>) { return 0; }
    get apl() { return 0; }
    get mpl() { return 0; }
    get mpl2() { return 0; }
    mul(consumption: Map<Product, number>) { return 0; }
}

abstract class LandProcess2 extends Process2 {
    acres = 0;

    override canUse(terrain: Terrain) { return true; }

    override get acresDisplay() { return this.acres.toFixed(0); }
}

class LandUseProcess extends LandProcess2 {
    constructor(
        readonly tile: Tile,
        readonly terrain: Terrain, 
        readonly role: Role,
        private readonly product_: Product, 
        readonly baseAcresPerWorker: number, readonly baseOutput: number) {

        super();
    }

    get name() { return this.terrain.name + ' ' + this.product.name; }
    get modifiedBaseOutput() { return this.baseOutput * this.outputFactor.value; }

    override canUse(terrain: Terrain) { return terrain === this.terrain; }
    override canBeWorkedBy(pop: Pop) { return pop.role === this.role; }
    override get product(): Product {
        return this.product_;
    }

    override apply() {
        this.outputFactor = this.tile.outputFactor(this.product);

        this.output = CESProductionExpOneHalf(
            0.6, 0.4, this.baseAcresPerWorker, this.modifiedBaseOutput, this.workers, this.acres);
    }

    override get apk() { return this.output / this.acres; }
    override get mpk() { 
        return CESMPLandExpOneHalf(
            0.6, 0.4, this.baseAcresPerWorker, this.modifiedBaseOutput, this.workers, this.acres);
    }
    override get mpk2() { 
        return CESProductionExpOneHalf(
            0.6, 0.4, this.baseAcresPerWorker, this.modifiedBaseOutput, this.workers, this.acres + 1)
             - CESProductionExpOneHalf(
            0.6, 0.4, this.baseAcresPerWorker, this.modifiedBaseOutput, this.workers, this.acres)
    }
    override muk(consumption: Map<Product, number>) { 
        return this.mpk * marginalNutrition(consumption, this.product); 
    }

    override get apl() { return this.output / this.workers; }
    override get mpl() { 
        return CESMPLaborExpOneHalf(
            0.6, 0.4, this.baseAcresPerWorker, this.modifiedBaseOutput, this.workers, this.acres);
    }
    override get mpl2() { 
        return CESProductionExpOneHalf(
            0.6, 0.4, this.baseAcresPerWorker, this.modifiedBaseOutput, this.workers + 1, this.acres)
             - CESProductionExpOneHalf(
            0.6, 0.4, this.baseAcresPerWorker, this.modifiedBaseOutput, this.workers, this.acres)
    }
    override mul(consumption: Map<Product, number>) { 
        return this.mpl * marginalNutrition(consumption, this.product); 
    }

    override get terrainDisplay() { return this.terrain.name; }
    override get acresPerWorkerDisplay() { return this.workers ? (this.acres / this.workers).toFixed(1) : ''; }
    override get productDisplay() { return this.product.name; }
}

class ConstructionProcess extends Process2 {
    get name() { return 'Construction'; }
    override get productDisplay() { return 'Construction'; }
}

class RitualProcess extends Process2 {
    get name() { return 'Rituals'; }
    override get productDisplay() { return 'Rituals'; }

    override canBeWorkedBy(pop: Pop) { return pop.role === Roles.Priests; }
}

class LeisureProcess extends Process2 {
    constructor(readonly role: Role) {
        super();
    }
    get name() { return 'Leisure'; }
    //override canBeWorkedBy(pop: Pop) { return pop.role === this.role; }
    override canBeWorkedBy(pop: Pop) { return false; }
    override get outputDisplay() { return ''; }
    override get productDisplay() { return 'Leisure'; }
}

class FallowProcess extends LandProcess2 {
    get name() { return 'Fallow'; }
    override get outputDisplay() { return ''; }
    override get productDisplay() { return 'Fallow'; }

    override canUse(terrain: Terrain) { return false; }
}

export class TileProduction {
    constructor(readonly tile: Tile, readonly pop: Pop) {}

    readonly fallowProcess = new FallowProcess();
    readonly leisureProcesses = [
        new LeisureProcess(Roles.Priests),
        new LeisureProcess(Roles.ClansPeople),
    ];
    readonly tradeoffProcesses = [
        new LandUseProcess(this.tile, Alluvium, Roles.ClansPeople, Barley, 10, 5),
        new LandUseProcess(this.tile, Alluvium, Roles.ClansPeople, Lentils, 7, 2.5),
    ]
    readonly landAndLaborProcesses = [
        ...this.tradeoffProcesses,
        new LandUseProcess(this.tile, DryLightSoil, Roles.ClansPeople, Dairy, 100, 5),
        new LandUseProcess(this.tile, Desert, Roles.ClansPeople, Dairy, 400, 4),
    ].filter(p => this.tile.fractionOf(p.terrain));
    readonly landProcesses = [
        ...this.landAndLaborProcesses,
        //this.fallowProcess,
    ];
    readonly laborProcesses = [
        ...this.landAndLaborProcesses,
        new ConstructionProcess(),
        new RitualProcess(),
        //...this.leisureProcesses,
    ]
    readonly processes = [
        ...this.laborProcesses,
        //this.fallowProcess,
    ];

    readonly laborPools = this.tile.pop.pops.map(pop => new LaborPool(pop, this.laborProcesses));

    readonly landPools = [Alluvium, DryLightSoil, Desert]
        .map(terrain => new LandPool(this.tile, terrain, this.landProcesses, this.fallowProcess));

    readonly pools = [...this.laborPools, ...this.landPools];
    readonly alluviumPool = this.landPools.find(p => p.terrain === Alluvium);

    output = new Map<Product, number>();

    get consumption() { return this.pop.consumption2.amounts; }

    initAllocs() {
        for (const pool of this.pools) {
            pool.allocEqual();
        }
    }

    allocate() {
        for (let i = 0; i < 100; ++i) {
            const u = nutrition(this.consumption).value;
            this.allocateOneStep();
            const v = nutrition(this.consumption).value;
            // Utility will be slightly lower than optimum but it should be close.
            if (v <= u) break;
        }
    }

    allocateOneStep() {
        this.allocateLabor();
        this.allocateLand();
    }

    allocateLabor() {
        for (const pool of this.laborPools) {
            if (pool.allocs.size < 1) continue;

            const chunkSize = 0.01;
            for (let i = 0; i < 1; ++i) {
                const [luPool, lu] = argmin([...pool.allocs.keys()], p => p.mul(this.consumption));
                const [muPool, mu] = argmax([...pool.allocs.keys()], p => p.mul(this.consumption));
                
                if (luPool !== muPool) {
                    pool.realloc(luPool!, muPool!, chunkSize);
                    this.updateSinks();
                }
            }
        }
    }

    allocateLand() {
        if (this.alluviumPool) {
            const [p0, p1] = this.tradeoffProcesses;
            const chunkSize = 0.01;
            for (let i = 0; i < 1; ++i) {
                if (p0.muk(this.consumption) > p1.muk(this.consumption)) {
                    this.alluviumPool.realloc(p1, p0, chunkSize);
                    this.updateSinks();
                } else {
                    this.alluviumPool.realloc(p0, p1, chunkSize);
                    this.updateSinks();
                }
            }
        }
    }

    update() {
        this.allocate();
        for (const process of this.processes) process.reset();
        for (const pool of this.pools) pool.apply();
        for (const process of this.processes) process.apply();
        this.updateSinks();
    }
    
    updateSinks() {
        this.updateOutput();
        this.updateConsumption();
    }

    updateOutput() {
        this.output.clear();
        for (const p of this.processes) {
            if (p.product) {
                this.output.set(p.product, (this.output.get(p.product) || 0) + p.output);
            }
        }
    }

    updateConsumption() {
        this.pop.consumption2.setProduction(this.output);
    }
}