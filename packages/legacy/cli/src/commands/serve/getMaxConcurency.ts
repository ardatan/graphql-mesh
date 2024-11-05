/* eslint-disable import/no-nodejs-modules */
import { availableParallelism, cpus, freemem } from 'os';

function getFreeMemInGb() {
  return freemem() / 1024 ** 3;
}

function getMaxConcurrencyPerMem() {
  return parseInt(String(getFreeMemInGb()));
}

function getMaxConcurrencyPerCpu() {
  try {
    return availableParallelism();
  } catch (e) {
    return cpus().length;
  }
}

export function getMaxConcurrency() {
  const result = Math.min(getMaxConcurrencyPerMem(), getMaxConcurrencyPerCpu());
  if (result < 1) {
    return 1;
  }
  return result;
}
