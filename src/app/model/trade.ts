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
    // Barters are represented by bidirectionally linking paired transfers.
    inExchangeFor: Transfer | undefined;

    constructor(readonly link: TradeLinkDirection, readonly product: Product, public amount: number) {}

    get src() { return this.link.src; }
    get dst() { return this.link.dst; }

    get costFactor() { return 1.0 - this.link.cost.get(this.product); }
    get gross() { return this.amount; }
    get net() { return this.amount * this.costFactor; }
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
                const tradeLink = new TradeLink(this.tile.isRiver && neighbor.isRiver);
                const sendLink = new TradeLinkDirection(this.tile, neighbor, tradeLink);
                const recvLink = new TradeLinkDirection(neighbor, this.tile, tradeLink);
                sendLink.reverse = recvLink;
                recvLink.reverse = sendLink;
                this.links.push(sendLink);
                neighbor.market.links.push(recvLink);
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
    message = '';

    readonly cost: PerProduce = this.alongRiver
        ? PerProduce.of([['Barley', 0.02], ['Lentils', 0.02], ['Dairy', 0.02]])
        : PerProduce.of([['Barley', 0.2], ['Lentils', 0.2], ['Dairy', 0.02]]);

    constructor(readonly alongRiver: boolean) {}
}

export class TradeLinkDirection {
    reverse!: TradeLinkDirection;
    transfers: Transfer[] = [];

    constructor(readonly src: Tile, readonly dst: Tile, readonly link: TradeLink) {}

    get alongRiver() { return this.link.alongRiver; }

    get cost() { return this.link.cost; }

    get isActive() { return this.transfers.length > 0; }

    get exchanges(): [Transfer, Transfer][]{
        return this.transfers.map(t => [t, t.inExchangeFor!]);
    }

    get message() { return this.link.message; }
    set message(m: string) { this.link.message = m; }

    findExchange(src: Tile, srcProduct: Product, dst: Tile, dstProduct: Product): Transfer | undefined {
        return this.transfers.find(t =>
            t.dst == dst && t.product === srcProduct &&
            t.inExchangeFor?.dst === src && t.inExchangeFor?.product === dstProduct);
    }

    findOrCreateExchange(src: Tile, srcProduct: Product, dst: Tile, dstProduct: Product): Transfer {
        let transfer = this.findExchange(src, srcProduct, dst, dstProduct);
        if (!transfer) {
            const send = new Transfer(this, srcProduct, 0);
            const recv = new Transfer(this.reverse, dstProduct, 0);
            send.inExchangeFor = recv;
            recv.inExchangeFor = send;

            this.transfers.push(send);
            this.reverse.transfers.push(recv);

            transfer = send;
        }
        return transfer;
    }

    incrExchange(srcProduct: Product, dstProduct: Product, amount: number) {
        const send = this.findOrCreateExchange(this.src, srcProduct, this.dst, dstProduct);
        send.amount += amount;
        send.inExchangeFor!.amount += amount;
    }

    clear() {
        this.transfers = [];
        this.reverse.transfers = this.reverse.transfers.filter(t => t.dst !== this.src); 
        this.message = '';}
}