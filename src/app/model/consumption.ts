import { Product } from "./production";
import { Tile } from "./tile";
import { Nutrition, nutrition } from "./utility";

export class Transfer {
    constructor(readonly tag: string, product: Product, readonly delta: number) {}
}

export interface Consumer {

}

export class Consumption {
    constructor(consumer: Consumer) {}

    readonly production = new Map<Product, number>();
    readonly trade = new Map<Product, number>();
    readonly transfers = new Map<Product, Transfer>();
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

    setTransfer(target: Consumption, fraction: number): void {
        this.transfers.clear();
        target.transfers.clear();
        for (const [p, q] of this.amounts.entries()) {
            const delta = -Math.floor(q * fraction);
            this.transfers.set(p, new Transfer('transfer', p, delta));
            target.transfers.set(p, new Transfer('transfer', p, -delta));
        }
        this.refresh();
        target.refresh();
    }

    private refresh(): void {
        this.amounts.clear();
        this.production.forEach((q, p) => this.amounts.set(p, q));
        this.trade.forEach((q, p) => this.amounts.set(p, (this.amounts.get(p) || 0) + q));
        this.transfers.forEach((t, p) => this.amounts.set(p, (this.amounts.get(p) || 0) + t.delta));

        this.nutrition = nutrition(this.amounts);
    }
}