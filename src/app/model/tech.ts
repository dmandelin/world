import { Allocation, Barley, Dairy, Lentils, Product } from './production';

export class Tech {
    constructor(readonly name: string) {}
}

export class ProductionTech extends Tech {
    constructor(
        name: string,
        readonly product: Product,
        readonly inputBoost: number) {
            
        super(name);
    }
}

export class Techs {
    static readonly initialTechs: [Product, ProductionTech][] = [
        [Barley, new ProductionTech('Barley I', Barley, 1.0)],
        [Lentils, new ProductionTech('Lentils I', Lentils, 1.0)],
        [Dairy, new ProductionTech('Pastoralism I', Dairy, 1.0)],
    ];

    private readonly techs: ProductionTech[] = [];

    constructor() {
        const improvedBarleyFarming = new ProductionTech('Barley II', Barley, 1.5);
        const improvedLentilFarming = new ProductionTech('Lentils II', Barley, 1.3);
        const improvedPastoralism = new ProductionTech('Pastoralism II', Barley, 1.2);

        this.techs.push(...Techs.initialTechs.map(([_, t]) => t));

        this.techs.push(improvedBarleyFarming);
        this.techs.push(improvedLentilFarming);
        this.techs.push(improvedPastoralism);
    }
}

export class TechKit {
    private readonly map: Map<Product, ProductionTech> = new Map(Techs.initialTechs);

    advance(totalLabor: number, allocs: readonly Allocation[]) {
        /*
        for (const alloc of allocs) {
            const labor = alloc.laborFraction * totalLabor;
            console.log(labor * 4e-7);
            if (Math.random() <= labor * 4e-7) {
                console.log('TechKit.advance: teching up', alloc);
            }
        }
        */
    }

    get(product: Product): ProductionTech {
        const t = this.map.get(product);
        if (!t) throw `No tech for ${product.name}`;
        return t;
    }
}
