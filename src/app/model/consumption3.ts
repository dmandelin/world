import { Barley, Lentils, Product } from "./production";

interface Consumer {}

export class Consumption {
    constructor(consumer: Consumer) {}

    readonly production = new Map<Product, number>();
    readonly totals = new Map<Product, number>();
    
    readonly nutrition = {
        value: 0,
        quantity: 0,
        quality: 1,
    };

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

        this.updateNutrition(this.totals);
    }

    private refresh() {
        this.totals.clear();
        this.production.forEach((q, p) => this.totals.set(p, q));

        this.updateNutrition(this.totals);
    }

    private updateNutrition(consumption: Map<Product, number>) {
        // Ideal ratio is 2:1 barley:lentils. Apply a quadratic penalty
        // factor for too low a proportion of either one.
        const barley = consumption.get(Barley) || 0;
        const lentils = consumption.get(Lentils) || 0;
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

        this.nutrition.quantity = total;
        this.nutrition.quality = factor;
        this.nutrition.value = Math.round(total * factor);
    }
}