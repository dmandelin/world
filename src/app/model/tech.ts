import { Barley, Dairy, Lentils, Product, TempleConstruction } from './production';
import { TileProduction } from './production2';

export class Tech {
    constructor(readonly name: string) {}
}

export class ProductionTech extends Tech {
    readonly reqs = new Set<ProductionTech>();
    readonly next = new Set<ProductionTech>();

    constructor(
        name: string,
        readonly complexity: number,
        readonly product: Product,
        readonly inputBoost: number,
        reqs: Iterable<ProductionTech> = []) {
            
        super(name);

        for (const t of reqs) {
            this.reqs.add(t);
            t.next.add(this);
        }
    }

    get hasNext(): boolean {
        return this.next.size > 0;
    }

    get s(): string {
        return this.name.endsWith('II') ? '2' : '1';
    }
}

class TechsSingleton {
    readonly basicBarleyFarming = new ProductionTech('Barley I', 0.5, Barley, 1.0);
    readonly basicLentilFarming = new ProductionTech('Lentils I', 0.5, Lentils, 1.0);
    readonly basicPastoralism = new ProductionTech('Pastoralism I', 0.5, Dairy, 1.0);
    readonly basicTempleConstruction = new ProductionTech('Building I', 0.5, TempleConstruction, 1.0);

    readonly initialTechs: [Product, ProductionTech][] = [
        [Barley, this.basicBarleyFarming],
        [Lentils, this.basicLentilFarming],
        [Dairy, this.basicPastoralism],
        [TempleConstruction, this.basicTempleConstruction],
    ];

    private readonly techs: ProductionTech[] = [];

    constructor() {
        const improvedBarleyFarming = new ProductionTech(
            'Barley II', 0.6, Barley, 1.5, [this.basicBarleyFarming]);
        const improvedLentilFarming = new ProductionTech(
            'Lentils II', 0.6, Lentils, 1.3, [this.basicLentilFarming]);
        const improvedPastoralism = new ProductionTech(
            'Pastoralism II', 0.6, Dairy, 1.2, [this.basicPastoralism]);

        this.techs.push(...this.initialTechs.map(([_, t]) => t));

        this.techs.push(improvedBarleyFarming);
        this.techs.push(improvedLentilFarming);
        this.techs.push(improvedPastoralism);
    }
}

export const Techs = new TechsSingleton();

export class TechKit {
    private readonly map: Map<Product, ProductionTech> = new Map(Techs.initialTechs);

    advance(totalLabor: number, prod: TileProduction): ProductionTech[] {
        const a: ProductionTech[] = [];
        // TODO restore
        /*
        for (const proc of prod.processes) {
            if (!proc.tech.hasNext) continue;
            if (Math.random() <= proc.workers * 1e-6) {
                const nextTech = proc.tech.next.values().next().value;
                this.map.set(nextTech.product, nextTech);
                a.push(nextTech);
            }
        }
        */
        return a;
    }

    adopt(tech: ProductionTech) {
        this.map.set(tech.product, tech);
    }

    get(product: Product): ProductionTech {
        const t = this.map.get(product);
        if (!t) throw `No tech for ${product.name}`;
        return t;
    }

    get techs(): ProductionTech[] {
        return [...this.map.values()];
    }

    get asMap(): Map<Product, ProductionTech> {
        return new Map(this.map);
    }

    get complexity(): number {
        return this.techs.reduce((a, t) => a + t.complexity, 0);
    }
}
