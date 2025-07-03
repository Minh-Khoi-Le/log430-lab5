// Store Entity - Represents physical store locations
export class Store {
  constructor(
    public readonly id: number,
    public name: string,
    public address?: string
  ) {}

  updateDetails(name?: string, address?: string): void {
    if (name) this.name = name;
    if (address !== undefined) this.address = address;
  }

  isValid(): boolean {
    return this.name.length > 0;
  }
}
