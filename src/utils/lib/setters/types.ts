export type Setter<T> = (value: Updater<T>) => void;
export type Updater<T> = T | ((prev: T) => T);
