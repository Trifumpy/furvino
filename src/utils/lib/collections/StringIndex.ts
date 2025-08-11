import { Trie } from "./Trie";

export type IndexOptions = {
  caseSensitive?: boolean;
}

export class StringIndex<T> {
  private index: Trie<T> = new Trie<T>();

  constructor(options?: IndexOptions) {
    this.caseSensitive = options?.caseSensitive ?? false;
  }
  private readonly caseSensitive: boolean = false;

  private transformKey(key: string): string {
    return this.caseSensitive ? key : key.toLowerCase();
  }

  private buildKeys(key: string): string[] {
    const s = this.transformKey(key) + "$";
    const rotations: string[] = [];
    for (let i = 0; i < s.length; i++) {
      rotations.push(s.slice(i) + s.slice(0, i));
    }
    return rotations;
  }

  add(key: string, value: T): void {
    const keys = this.buildKeys(key);
    for (const k of keys) {
      this.index.add(Array.from(k), value);
    }
  }

  get(key: string): T | null {
    return this.index.get(Array.from(key.toLowerCase() + "$"));
  }

  findInfix(query: string): T[] {
    // We don't add the '$' because we don't want to match the end or start of the string
    const key = Array.from(this.transformKey(query));
    const trie = this.index.getPrefix(key);
    return this.returnArrayFromTrie(trie);
  }

  findPrefix(query: string): T[] {
    // We want to match the prefix, so we add the '$' at the start
    const key = Array.from("$" + this.transformKey(query));
    const trie = this.index.getPrefix(key);
    return this.returnArrayFromTrie(trie);
  }

  findSuffix(query: string): T[] {
    // We want to match the suffix, so we add the '$' at the end
    const key = Array.from(this.transformKey(query) + "$");
    const trie = this.index.getPrefix(key);
    return this.returnArrayFromTrie(trie);
  }

  private returnArrayFromTrie(trie: Trie<T> | undefined | null): T[] {
    if (!trie) {
      return [];
    }
    return [...new Set(trie.toArray())];
  }

  clear() {
    this.index.clear();
  }
}
