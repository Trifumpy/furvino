export class Trie<T> {
  private root: T | null = null;
  private children: Map<string, Trie<T>> = new Map();
  private length: number = 0;
  public get size(): number {
    return this.length;
  }

  constructor() {}

  add(path: string[], value: T): number {
    if (path.length === 0) {
      const wasEmpty = this.root === null;
      this.root = value;
      return wasEmpty ? 1 : 0; // Return 1 if it was added, 0 if it was already present
    }

    const [head, ...tail] = path;
    let child = this.children.get(head);

    if (!child) {
      child = new Trie<T>();
      this.children.set(head, child);
    }

    const added = child.add(tail, value);
    this.length += added;
    return added;
  }

  get(path: string[]): T | null {
    const trie = this.getPrefix(path);
    return trie ? trie.root : null;
  }

  getPrefix(path: string[]): Trie<T> | null {
    if (path.length === 0) {
      return this;
    }

    const [head, ...tail] = path;
    const child = this.children.get(head);
    return child ? child.getPrefix(tail) : null;
  }

  toArray(): T[] {
    const result: T[] = [];
    if (this.root !== null) {
      result.push(this.root);
    }
    for (const child of this.children.values()) {
      result.push(...child.toArray());
    }
    return result;
  }

  clear(): void {
    this.root = null;
    this.children.clear();
    this.length = 0;
  }

  toString(): string {
    const entries: string[] = [];
    for (const [key, child] of this.children.entries()) {
      entries.push(`${key}: ${child.toString()}`);
    }
    return `{ root: ${this.root}, children: { ${entries.join(", ")} } }`;
  }
}
