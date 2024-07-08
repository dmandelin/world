import {Tile} from './tile';
import {PerProduce, ProduceInfo, marginalCapacity} from './production';

// Transaction cost estimates from previous analysis:
//
// For transporting grain that draft animals or humans can eat,
// or any other good of similar value per wagonload, the total 
// transaction cost for a 1-tile trip (~15 mi) is:
//
// - porters: 0.2
// - pack animals: 0.1
// - wagons: 0.05
// - river: 0.01
// - sea: 0.002
//
// About half the cost is expenditures, half hazards. With more
// valuable goods, expenditures scale down, but hazards are
// constant or even increase due to easier theft.
//
// For "dairy", goats and sheep are being transported, and are
// cheap to transport over grazeable areas: 0.02 per tile.
//
// For, we're not modeling taxes or endpoint costs, because they're
// not important to single-tile trade. They could become important
// later.

// In the earliest period, we'll assume:
// - crude rafts along rivers, cost 0.02 per tile for cereals/legumes
//   - pack animals came into use circa 3500 BC
// - porters elsewhere, cost 0.2 per tile for cereals/legumes
// - cost 0.02 per tile for dairy
//   - situation is different per terrain in complicated ways so ignore for now

export class Market {
    readonly tradeLinks: TradeLink[] = [];
    message: string = '';

    constructor(readonly tile: Tile) {}

    initialize() {
        for (const [dx, dy] of [[1, 0], [0, 1]]) {
            const [ni, nj] = [this.tile.i + dx, this.tile.j + dy];
            if (ni >= 0 && ni < this.tile.world.map.height && nj >= 0 && nj < this.tile.world.map.width) {
                const neighbor = this.tile.world.map.tiles[ni][nj];
                const tradeLink = new TradeLink(this.tile, neighbor, this.tile.isRiver && neighbor.isRiver);
                this.tradeLinks.push(tradeLink);
                neighbor.market.tradeLinks.push(tradeLink);
            }
        }
    }

    update() {
        // Seek beneficial trades, but spread out the trade across different
        // links, because people will want to spread out risks.

        // At first, trade will be consumption-driven: the people of a tile
        // will seek to trade for goods with the highest marginal utility.
        // Trade partners themselves will also want to get what has the highest
        // marginal utility to them among what's available.

        // Reset and recalculate from scratch each time.
        this.message = '';
        this.tradeLinks.forEach(l => l.clear());

        // Get the current production so we don't have to recalculate too much.
        const p = this.tile.production.Total;
        const nnp = new Map(this.tradeLinks.map(l => [l, l.other(this.tile).production.Total]));
        let mu = marginalCapacity(p);
        let nnmu = new Map([...nnp.entries()].map(([l, p]) => [l, marginalCapacity(p)]));

        // Do a maximum number of iterations.
        for (let i = 0; i < 1000; ++i) {
            // Try to increment trade along each link in turn.
            const dg = mu.max()[0];
            for (const l of this.tradeLinks) {
                const nmu = nnmu.get(l);
                if (!nmu) continue;
                const sg = nmu.max()[0];

                // If the trade is beneficial to both sides, increment trade amounts
                // and decrement production amounts so we don't trade goods that don't exist.
                const sgr = 1.0 - l.cost.get(sg);
                const dgr = 1.0 - l.cost.get(dg);

                const su = mu.get(dg) * dgr - mu.get(sg) * sgr;
                const du = nmu.get(sg) * sgr - nmu.get(dg) * dgr;

                switch (true) {
                    case su > 0 && du > 0:
                        // Update the trade link.
                        l.srcAmounts.incr(sg, 1);
                        l.dstAmounts.incr(dg, 1);
                        // Mark goods as traded away.
                        p.incr(sg, -1);
                        p.incr(dg, 1);
                        nnp.get(l)?.incr(dg, -1);
                        nnp.get(l)?.incr(sg, 1);
                        // Update marginal utilities.
                        mu = marginalCapacity(p);
                        nnmu.set(l, marginalCapacity(nnp.get(l)!));
                        break;
                    case su > 0 || du > 0:
                        l.message = `more trades available with variable prices, such as ${sg.name} for ${dg.name}`;
                        break;
                }
            }
        }
    }
}

export class TradeLink {
    readonly cost: PerProduce = this.alongRiver
        ? PerProduce.of([['Barley', 0.02], ['Lentils', 0.02], ['Dairy', 0.02]])
        : PerProduce.of([['Barley', 0.2], ['Lentils', 0.2], ['Dairy', 0.02]]);

    srcAmounts: PerProduce = PerProduce.of();
    dstAmounts: PerProduce = PerProduce.of();
    message: string = '';

    constructor(readonly src: Tile, readonly dst: Tile, readonly alongRiver: boolean) {}

    other(t: Tile) {
        return t === this.src ? this.dst : this.src;
    }

    thisAmount(t: Tile, p: ProduceInfo) {
        return t === this.src ? this.srcAmounts.get(p) : this.dstAmounts.get(p);
    }

    otherAmount(t: Tile, p: ProduceInfo) {
        return t === this.src ? this.dstAmounts.get(p) : this.srcAmounts.get(p);
    }

    get isNonZero() {
        return this.srcAmounts.entries().some(([p, v]) => v > 0) || this.dstAmounts.entries().some(([p, v]) => v > 0);
    }

    get tradedProducts() {
        return ProduceInfo.all.filter(p => this.srcAmounts.get(p) > 0 || this.dstAmounts.get(p) > 0);
    }

    clear() {
        this.srcAmounts = PerProduce.of();
        this.dstAmounts = PerProduce.of();
        this.message = '';
    }

    update() {
        // Search for unit-for-unit trades that increase capacity on both sides.
        const sc = this.src.capacity;
        const dc = this.dst.capacity;

        const smc = this.src.marginalCapacity;
        const dmc = this.dst.marginalCapacity;

        for (const sg of ProduceInfo.all) { // Source good traded away
            for (const dg of ProduceInfo.all) {
                if (sg === dg) continue;
                if (this.src.production.Total.get(sg) < 1) continue;

                const sgr = 1.0 - this.cost.get(sg);
                const dgr = 1.0 - this.cost.get(dg);

                const su = smc.get(dg) * dgr - smc.get(sg) * sgr;
                const du = dmc.get(sg) * sgr - dmc.get(dg) * dgr;
                
                this.message = '';
                switch (true) {
                    case su > 0 && du > 0:
                        this.srcAmounts.incr(sg, 1);
                        this.dstAmounts.incr(dg, 1);
                        break;
                    case su > 0 || du > 0:
                        this.message = `more trades available with variable prices, such as ${sg.name} for ${dg.name}`;
                        break;
                }
            }
        }
    }
}