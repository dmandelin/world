export function exists<T>(a: T, message = 'Assertion failed'): NonNullable<T> {
    if (!a) {
        throw new Error(message);
    }
    return a;
}

export function assert(condition: any, message = 'Assertion failed'): asserts condition {
    if (!condition) {
        throw new Error(message);
    }
}

export function clamp(x: number, a: number, b: number) {
    return Math.min(Math.max(x, a), b);
}

export function randint(a: number, b?: number) {
    if (b === undefined) {
        [a, b] = [0, a];
    }
    return a + Math.floor(Math.random() * (b - a));
}

export function randelem<T>(elems: readonly T[]): T {
    return elems[randint(elems.length)];
}

export function shuffled<T>(items: readonly T[]): T[] {
    const ws = [...items];
    const ss = [];
    while (ws.length) {
        const i = randint(ws.length);
        ss.push(...ws.splice(i, 1));
    }
    return ss;
}

export function sorted<T>(
    items: readonly T[], 
    keyFun: undefined|((item: T) => number)|((item: T) => string) = undefined) {
    const xs = [...items];
    if (keyFun === undefined) {
        xs.sort();
    } else {
        xs.sort((a, b) => {
            const [as, bs] = [keyFun(a), keyFun(b)];
            return as < bs ? -1 : bs < as ? 1 : 0;
        });
    }
    return xs;
}

export function sum(items: readonly number[]): number {
    return items.reduce((a, b) => a + b, 0);
}

export function argmax<T>(items: readonly T[], valueFun: (item: T) => number): [T|undefined, number] {
    let bestItem = undefined;
    let bestValue = undefined;
    for (const item of items) {
        const value = valueFun(item);
        if (bestValue === undefined || value > bestValue) {
            [bestItem, bestValue] = [item, value];
        }
    }
    return [bestItem, bestValue || 0];
}

export function argmin<T>(items: readonly T[], valueFun: (item: T) => number): [T|undefined, number] {
    let bestItem = undefined;
    let bestValue = undefined;
    for (const item of items) {
        const value = valueFun(item);
        if (bestValue === undefined || value < bestValue) {
            [bestItem, bestValue] = [item, value];
        }
    }
    return [bestItem, bestValue || 0];
}

export function mapmax<T>(map: Map<T, number>, filterFun: (t: T) => boolean = () => true): [T|undefined, number] {
    let bestKey = undefined;
    let bestValue = undefined;
    for (const [key, value] of map) {
        if (!filterFun(key)) continue;
        if (bestValue === undefined || value > bestValue) {
            [bestKey, bestValue] = [key, value];
        }
    }
    return [bestKey, bestValue || 0];
}

export function mapmin<T>(map: Map<T, number>, filterFun: (t: T) => boolean = () => true): [T|undefined, number] {
    let bestKey = undefined;
    let bestValue = undefined;
    for (const [key, value] of map) {
        if (!filterFun(key)) continue;
        if (bestValue === undefined || value < bestValue) {
            [bestKey, bestValue] = [key, value];
        }
    }
    return [bestKey, bestValue || 0];
}

export function divide(a: number, b: number): number[] {
    const q = Math.floor(a / b);
    const r = a % b;
    const ans = new Array(b).fill(q);
    for (let i = 0; i < r; i++) {
        ans[i]++;
    }
    return ans;
}

export function zip<T,U>(ts: T[], us: U[]): any[][] {
    return ts.map((t, i) => [t, us[i]]);
}