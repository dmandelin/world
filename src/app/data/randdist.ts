// Random distributions

/**
 * Generates a random value from a normal distribution
 * with a given mean and standard deviation.
 * 
 * @param mean - The mean of the distribution (default is 1)
 * @param stddev - The standard deviation of the distribution
 * @returns A random value from the distribution
 */
export function normal(stddev: number): number;
export function normal(mean: number, stddev: number): number;
export function normal(meanOrStddev: number, stddev?: number): number {
    let mean: number;
    if (stddev === undefined) {
        mean = 0;
        stddev = meanOrStddev;
    } else {
        mean = meanOrStddev;
    }

    // Generate two uniform random numbers between 0 and 1
    const u1 = Math.random();
    const u2 = Math.random();

    // Apply the Box-Muller transform
    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);

    // Scale by the standard deviation and shift by the mean
    return z0 * stddev + mean;
}

export function lognormal(stddev: number): number;
export function lognormal(mean: number, stddev: number): number;
export function lognormal(meanOrStddev: number, stddev?: number): number {
    return Math.exp(
        stddev === undefined 
            ? normal(meanOrStddev) 
            : normal(meanOrStddev, stddev)
    );
}
