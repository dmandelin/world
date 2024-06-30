export class Settlement {
    constructor(readonly population: number) {}

    static zipfSettlements(totalPopulation: number): Settlement[] {
        // If smaller than anything in our list, there's only one settlement.
        if (totalPopulation < cache[0][0]) {
            return [new Settlement(totalPopulation)];
        }

        // Find the biggest total population settlement list that under the target.
        let i;
        for (i = 0; i < cache.length; ++i) {
            if (totalPopulation < cache[i + 1][0]) break;
        }

        // Copy out the settlements, distributing extra population proportionally.
        let f = totalPopulation / cache[i][0];
        let ss = [];
        let tpop = 0;
        for (const s of cache[i][1]) {
            const spop = Math.floor(f * s.population);
            tpop += spop;
            ss.push(new Settlement(spop));
        }

        // Adjust the population of the largest to make totals match.
        let ls = ss.shift();
        ss.unshift(new Settlement((ls?.population || 0) + totalPopulation - tpop));

        return ss;
    }
}

const cache = initSettlements();

function initSettlements(): [number, Settlement[]][] {
    const mss = 200;
    const ans: [number, Settlement[]][] = [];
    for (let i = 1; i < 100; ++i) {
        const ss = [];
        const bss = i * mss;
        let tpop = 0;
        for (let j = 1; j <= i; ++j) {
            const s = new Settlement(Math.floor(bss / j));
            ss.push(s);
            tpop += s.population;
        }

        ans.push([tpop, ss]);
    }
    return ans;
}