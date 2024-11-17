import { Barley, Dairy, Lentils, Product } from "./production";

interface Consumer {}

export type Nutrition = {
    value: number;
    quantity: number;
    quality: number;
}

export class Consumption {
    constructor(consumer: Consumer) {}

    readonly production = new Map<Product, number>();
    readonly totals = new Map<Product, number>();
    
    nutrition = {
        value: 0,
        quantity: 0,
        quality: 1,
    };

    marginalUtility(product: Product): number {
        const v0 = this.nutrition.value;
        const v1 = nutrition(this.totals, product).value;
        return v1 - v0;
    }

    clearProduction(): void {
        this.production.clear();
        this.refresh();
    }

    setItemProduction(product: Product, quantity: number): void {
        this.production.set(product, quantity);
        this.refresh();
    }

    setProduction(production: Map<Product, number>): void {
        this.production.clear();
        production.forEach((q, p) => this.production.set(p, q));
        this.refresh();
    }

    addProduction(product: Product, quantity: number): void {
        this.production.set(product, (this.production.get(product) || 0) + quantity);
        this.totals.set(product, (this.totals.get(product) || 0) + quantity);

        this.nutrition = nutrition(this.totals);
    }

    refresh() {
        this.totals.clear();
        this.production.forEach((q, p) => this.totals.set(p, q));

        this.nutrition = nutrition(this.totals);
    }
}

function nutrition(consumption: Map<Product, number>, marginalProduct?: Product): Nutrition {
    // Ideal ratio is 6:3:1 barley:lentils:dairy. Apply a quadratic penalty
    // factor for too low a proportion of anything.
    const barley = (consumption.get(Barley) || 0) + Number(marginalProduct === Barley);
    const lentils = (consumption.get(Lentils) || 0) + Number(marginalProduct === Lentils);
    const dairy = (consumption.get(Dairy) || 0) + Number(marginalProduct === Dairy);
    const total = barley + lentils + dairy;

    const pf = (ratio: number, target: number, penalty: number) => {
        const relDiff = (target - ratio) / target;
        return relDiff > 0 ? 1 - relDiff * relDiff * penalty : 1;
    };

    let factor = 1;
    // Small penalty for not enough plant foods.
    factor *= pf((barley + lentils) / total, 0.7, 0.2);
    // Large penalty for not enough animal foods.
    factor *= pf(dairy / total, 0.1, 0.4);
    // Large penalty for not enough lentils, but scales down if plant
    // foods are not a big part of the diet.
    factor *= pf(lentils / (barley + lentils), 0.333, 0.4 * (barley + lentils) / total);

    return {
        quantity: total,
        quality: factor,
        value: total * factor,
    }
}
