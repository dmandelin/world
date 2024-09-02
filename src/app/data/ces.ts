export function CESProductionExpOneHalf(
    laborWeight: number, landWeight: number, 
    acresPerLandUnit: number, 
    workers: number, acres: number,
    baseOutput: number) {

    if (workers === 0 || acres === 0) return 0;
    const land = acres / acresPerLandUnit;
    return baseOutput / (laborWeight / workers + landWeight / land);
}