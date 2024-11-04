import { Product } from "./production";

interface Consumer {}

export class Consumption {
    constructor(consumer: Consumer) {}

    readonly production = new Map<Product, number>();
    readonly totals = new Map<Product, number>();

    clearProduction(): void {
        this.production.clear();
        this.refreshTotals();
    }

    setProduction(production: Map<Product, number>): void {
        this.production.clear();
        production.forEach((q, p) => this.production.set(p, q));
        this.refreshTotals();
    }

    addProduction(product: Product, quantity: number): void {
        this.production.set(product, (this.production.get(product) || 0) + quantity);
        this.totals.set(product, (this.totals.get(product) || 0) + quantity);
    }

    private refreshTotals() {
        this.totals.clear();
        this.production.forEach((q, p) => this.totals.set(p, q));
    }
}