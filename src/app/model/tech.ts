import { Allocation, Barley, Dairy, Lentils, Product } from './production';

export class Tech {
    constructor(readonly name: string) {}
}

export class ProductionTech extends Tech {
    readonly reqs = new Set<ProductionTech>();
    readonly next = new Set<ProductionTech>();

    constructor(
        name: string,
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
    readonly basicBarleyFarming = new ProductionTech('Barley I', Barley, 1.0);
    readonly basicLentilFarming = new ProductionTech('Lentils I', Lentils, 1.0);
    readonly basicPastoralism = new ProductionTech('Pastoralism I', Dairy, 1.0);

    readonly initialTechs: [Product, ProductionTech][] = [
        [Barley, this.basicBarleyFarming],
        [Lentils, this.basicLentilFarming],
        [Dairy, this.basicPastoralism],
    ];

    private readonly techs: ProductionTech[] = [];

    constructor() {
        const improvedBarleyFarming = new ProductionTech(
            'Barley II', Barley, 1.5, [this.basicBarleyFarming]);
        const improvedLentilFarming = new ProductionTech(
            'Lentils II', Lentils, 1.3, [this.basicLentilFarming]);
        const improvedPastoralism = new ProductionTech(
            'Pastoralism II', Dairy, 1.2, [this.basicPastoralism]);

        this.techs.push(...this.initialTechs.map(([_, t]) => t));

        this.techs.push(improvedBarleyFarming);
        this.techs.push(improvedLentilFarming);
        this.techs.push(improvedPastoralism);
    }
}

export const Techs = new TechsSingleton();

export class TechKit {
    private readonly map: Map<Product, ProductionTech> = new Map(Techs.initialTechs);

    advance(totalLabor: number, allocs: readonly Allocation[]): ProductionTech[] {
        const a = []
        for (const alloc of allocs) {
            if (!alloc.tech.hasNext) continue;
            const labor = alloc.laborFraction * totalLabor;
            if (Math.random() <= labor * 1e-6) {
                const nextTech = alloc.tech.next.values().next().value;
                this.map.set(nextTech.product, nextTech);
                a.push(nextTech);
            }
        }
        return a;
    }

    get(product: Product): ProductionTech {
        const t = this.map.get(product);
        if (!t) throw `No tech for ${product.name}`;
        return t;
    }
}
