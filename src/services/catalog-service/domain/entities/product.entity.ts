// Product Entity - Core business object for catalog items
export class Product {
  constructor(
    public readonly id: number,
    public name: string,
    public price: number,
    public description?: string
  ) {}

  updatePrice(newPrice: number): void {
    if (newPrice < 0) {
      throw new Error('Price cannot be negative');
    }
    this.price = newPrice;
  }

  updateDetails(name?: string, description?: string): void {
    if (name) this.name = name;
    if (description !== undefined) this.description = description;
  }

  isValid(): boolean {
    return this.name.length > 0 && this.price >= 0;
  }
}
