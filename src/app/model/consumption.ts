import { Product } from "./production";
import { Tile } from "./tile";
import { Nutrition, nutrition } from "./utility";

export class TileConsumption {
    constructor(readonly tile: Tile) {}

    readonly production = new Map<Product, number>();
    readonly trade = new Map<Product, number>();
    readonly amounts = new Map<Product, number>();
    nutrition: Nutrition = nutrition(this.amounts);

    setProduction(production: Map<Product, number>): void {
        this.production.clear();
        production.forEach((q, p) => this.production.set(p, q));
        this.refresh();
    }

    resetTrade(): void {
        this.trade.clear();
        this.refresh();
    }

    setTrade(trade: Map<Product, number>): void {
        this.trade.clear();
        trade.forEach((q, p) => this.trade.set(p, q));
        this.refresh();
    }

    applyTrade(recvProduct: Product, recvAmount: number, sendProduct: Product, sendAmount: number): void {
        this.trade.set(recvProduct, (this.trade.get(recvProduct) || 0) + recvAmount);
        this.trade.set(sendProduct, (this.trade.get(sendProduct) || 0) - sendAmount);
        this.refresh();
    }

    private refresh(): void {
        this.amounts.clear();
        this.production.forEach((q, p) => this.amounts.set(p, q));
        this.trade.forEach((q, p) => this.amounts.set(p, (this.amounts.get(p) || 0) + q));

        this.nutrition = nutrition(this.amounts);
    }
}