import { Barley, Dairy, Lentils, Product } from "./production";

const proteinFractions = new Map<Product, number>([
    [Barley, 0.15],
    [Lentils, 0.3],
    [Dairy, 0.2],
]);

export class Nutrition {
    readonly proteinFactor = proteinQuality(this.proteinRatio)
    readonly value = this.amount * this.proteinFactor;

    constructor(readonly amount: number, readonly proteinRatio: number) {}
}

export function nutrition(consumption: Map<Product, number>): Nutrition {
    const energy = Array.from(consumption.values()).reduce((a, v) => a + v, 0);
    return new Nutrition(energy, proteinRatio(consumption));
}

export function marginalNutrition(consumption: Map<Product, number>, product: Product): number {
    const v0 = nutrition(consumption).value;
    const v1 = nutrition(new Map(consumption).set(product, (consumption.get(product) || 0) + 1)).value;
    return v1 - v0;
}

export function proteinQuality(r: number): number {
    if (r <= 0.2) {
        return -7.5 * r * r + 4 * r + 0.5;
    } else {
        return -0.390625 * r * r + 0.15625 * r + 0.984375;
    }
}

export function proteinRatio(consumption: Map<Product, number>): number {
    const totalProtein = Array.from(consumption.entries()).reduce((a, [product, amount]) => a + amount * proteinFractions.get(product)!, 0);
    const totalEnergy = Array.from(consumption.values()).reduce((a, v) => a + v, 0);
    const v = totalProtein / (totalEnergy || 1);
    if (!isFinite(v)) 
        debugger;
    return v;
}