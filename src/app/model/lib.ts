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