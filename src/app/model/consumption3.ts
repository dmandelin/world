import { Barley, Lentils, Product } from "./production";

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

    private refresh() {
        this.totals.clear();
        this.production.forEach((q, p) => this.totals.set(p, q));

        this.nutrition = nutrition(this.totals);
    }
}

function nutrition(consumption: Map<Product, number>, marginalProduct?: Product): Nutrition {
    // Ideal ratio is 2:1 barley:lentils. Apply a quadratic penalty
    // factor for too low a proportion of either one.
    const barley = (consumption.get(Barley) || 0) + Number(marginalProduct === Barley);
    const lentils = (consumption.get(Lentils) || 0) + Number(marginalProduct === Lentils);
    const total = barley + lentils;

    const barleyRatio = barley / total;
    const lentilsRatio = lentils / total;

    const penaltySources = [
        [barleyRatio, 0.667, 0.5],
        [lentilsRatio, 0.333, 0.8],
    ]

    let factor = 1;
    for (const [ratio, target, penalty] of penaltySources) {
        if (ratio < target) {
            const diff = target - ratio;
            const relDiff = diff / target;
            const penalty = relDiff * relDiff;
            factor *= 1 - relDiff * relDiff * penalty;
        }
    }

    return {
        quantity: total,
        quality: factor,
        value: total * factor,
    }
}
