export function CESProductionExpOneHalf(
    laborWeight: number, landWeight: number, 
    acresPerLandUnit: number, 
    baseOutput: number,
    workers: number, acres: number) {

    if (workers === 0 || acres === 0) return 0;
    const land = acres / acresPerLandUnit;
    return baseOutput / (laborWeight / workers + landWeight / land);
}

export function CESMPLandExpOneHalf(
    laborWeight: number, landWeight: number, 
    acresPerLandUnit: number,
    baseOutput: number,
    workers: number, acres: number) {

    if (workers === 0 || acres === 0) return 0;
    const land = acres / acresPerLandUnit;
    return landWeight / (land * land) / acresPerLandUnit
     * CESMPBase(laborWeight, landWeight, acresPerLandUnit, baseOutput, workers, acres);
}

export function CESMPLaborExpOneHalf(
    laborWeight: number, landWeight: number, 
    acresPerLandUnit: number,
    baseOutput: number,
    workers: number, acres: number) {

    if (workers === 0 || acres === 0) return 0;
    return laborWeight / (workers * workers)
     * CESMPBase(laborWeight, landWeight, acresPerLandUnit, baseOutput, workers, acres);
}

export function CESMPBase(
    laborWeight: number, landWeight: number, 
    acresPerLandUnit: number,
    baseOutput: number,
    workers: number, acres: number) {

    if (workers === 0 || acres === 0) return 0;
    const land = acres / acresPerLandUnit;
    const d = laborWeight / workers + landWeight / land;
    return baseOutput / (d * d);
}