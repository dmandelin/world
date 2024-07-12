import {Tile} from './tile';
import {PerProduce, Product, Products, marginalCapacity} from './production';

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

// A transfer of any amount of one product from one tile to another.
export class Transfer {
    constructor(
        readonly link: TradeLink, readonly src: Tile, readonly dst: Tile, 
        readonly product: Product, public amount: number) {}

    get costFactor() { return 1.0 - this.link.cost.get(this.product); }
    get gross() { return this.amount; }
    get net() { return this.amount * this.costFactor; }
}

// An exchange of products between two tiles.
export class Exchange {
    constructor(readonly link: TradeLink, readonly t1: Transfer, readonly t2: Transfer) {}

    sentBy(src: Tile): [Product, number] { 
        const t = this.link.a1 === src ? this.t1 : this.t2;
        return [t.product, t.gross];
    }
    recvBy(dst: Tile): [Product, number] {
        const t = this.link.a1 === dst ? this.t1 : this.t2;
        return [t.product, t.net];
    }

    sentByDelta(src: Tile) { return this.sentBy(src); }
    recvByDelta(dst: Tile): [Product, number] { const r = this.recvBy(dst); return [r[0], -r[1]]; }
}

// The trade economy of a tile. This isn't necessarily a market pe se.
export class Market {
    readonly links: TradeLinkDirection[] = [];
    message: string = '';

    constructor(readonly tile: Tile) {}

    initialize() {
        for (const [dx, dy] of [[1, 0], [0, 1]]) {
            const [ni, nj] = [this.tile.i + dx, this.tile.j + dy];
            if (ni >= 0 && ni < this.tile.world.map.height && nj >= 0 && nj < this.tile.world.map.width) {
                const neighbor = this.tile.world.map.tiles[ni][nj];
                const tradeLink = new TradeLink(this.tile, neighbor, this.tile.isRiver && neighbor.isRiver);
                this.links.push(new TradeLinkDirection(this.tile, neighbor, tradeLink));
                neighbor.market.links.push(new TradeLinkDirection(neighbor, this.tile, tradeLink));
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
        this.links.forEach(l => l.clear());

        // Get the current production so we don't have to recalculate too much.
        const p = this.tile.production.Total;
        const nnp = new Map(this.links.map(l => [l, l.dst.production.Total]));
        let mu = marginalCapacity(p);
        let nnmu = new Map([...nnp.entries()].map(([l, p]) => [l, marginalCapacity(p)]));

        // Do a maximum number of iterations.
        for (let i = 0; i < 1000; ++i) {
            // Try to increment trade along each link in turn.
            const dg = mu.max()[0];
            for (const l of this.links) {
                // TODO: Fix a bug where we are conflating the market's tile with the
                // trade link's source, but they're not always the same. It's probably
                // time to introduce a DirectedTradeLink concept that lets each market
                // have its own view of the trade links.
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
                        l.incrExchange(sg, dg, 1);
                        // Mark goods as traded away.
                        p.incr([sg, -1]);
                        p.incr([dg, 1]);
                        nnp.get(l)?.incr([dg, -1]);
                        nnp.get(l)?.incr([sg, 1]);
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

    exchanges: Exchange[] = [];

    constructor(readonly a1: Tile, readonly a2: Tile, readonly alongRiver: boolean) {}

    get isActive() {
        return this.exchanges.length > 0;
    }

    findExchange(src: Tile, srcProduct: Product, dst: Tile, dstProduct: Product): Exchange | undefined {
        return this.exchanges.find(e => 
            e.t1.src === src && e.t1.product === srcProduct && 
            e.t2.src === dst && e.t2.product === dstProduct ||
            e.t1.src === dst && e.t1.product === dstProduct && 
            e.t2.src === src && e.t2.product === srcProduct
        );
    }

    findOrCreateExchange(src: Tile, srcProduct: Product, dst: Tile, dstProduct: Product): Exchange {
        let exchange = this.findExchange(src, srcProduct, dst, dstProduct);
        if (!exchange) {
            const [a1, a2] = src === this.a1 ? [src, dst] : [dst, src];
            exchange = new Exchange(
                this,
                new Transfer(this, a1, a2, srcProduct, 0),
                new Transfer(this, a2, a1, dstProduct, 0));
            this.exchanges.push(exchange);
        }
        return exchange;
    }

    incrExchange(src: Tile, srcProduct: Product, dst: Tile, dstProduct: Product, amount: number) {
        const exchange = this.findOrCreateExchange(src, srcProduct, dst, dstProduct);
        exchange.t1.amount += amount;
        exchange.t2.amount += amount;
    }

    clear() {
        this.exchanges = [];
    }
}

export class TradeLinkDirection {
    message = '';

    constructor(readonly src: Tile, readonly dst: Tile, readonly link: TradeLink) {}

    get alongRiver() { return this.link.alongRiver; }
    get cost() { return this.link.cost; }

    get isActive() { return this.link.isActive; }
    get exchanges() { return this.link.exchanges; }
    get transfers() { return this.link.exchanges.flatMap(e => [e.t1, e.t2]); }

    incrExchange(srcProduct: Product, dstProduct: Product, amount: number) {
        this.link.incrExchange(this.src, srcProduct, this.dst, dstProduct, amount);
    }

    clear() { 
        this.link.clear(); 
        this.message = '';}
}