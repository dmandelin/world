import { Barley, Dairy, Lentils, Product } from "./production";

const proteinFractions = new Map<Product, number>([
    [Barley, 0.15],
    [Lentils, 0.3],
    [Dairy, 0.2],
]);

export class Nutrition {
    readonly value = this.amount;
    
    constructor(readonly amount: number) {}
}

export function nutrition(consumption: Map<Product, number>): Nutrition {
    const energy = Array.from(consumption.values()).reduce((a, v) => a + v, 0);
    return new Nutrition(energy);
}
