import * as WorkerPool from 'workerpool';

export const pool = WorkerPool.pool();

export const run = async <T extends (...args: any) => any>(func: T, ...args: Parameters<T>) => {
  const res = await pool.exec(func, args);
  return res;
}

export const makePooled = <T extends (...args: any) => any>(func: T) => {
  return async (...args: Parameters<T>) => {
    const res = await pool.exec(func, args);
    return res;
  }
}