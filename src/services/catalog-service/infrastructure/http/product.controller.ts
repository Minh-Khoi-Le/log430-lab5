import { ProductUseCases } from '../../application/use-cases/product.use-cases';

export class ProductController {
  constructor(private readonly productUseCases: ProductUseCases) {}

  async createProduct(req: any, res: any): Promise<void> {
    try {
      const product = await this.productUseCases.createProduct(req.body);
      res.status(201).json(product);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  async getProduct(req: any, res: any): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const product = await this.productUseCases.getProduct(id);
      res.json(product);
    } catch (error) {
      res.status(404).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  async getAllProducts(req: any, res: any): Promise<void> {
    try {
      const products = await this.productUseCases.getAllProducts();
      res.json(products);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  async updateProduct(req: any, res: any): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const product = await this.productUseCases.updateProduct(id, req.body);
      res.json(product);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  async deleteProduct(req: any, res: any): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      await this.productUseCases.deleteProduct(id);
      res.status(204).send();
    } catch (error) {
      res.status(404).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  async searchProducts(req: any, res: any): Promise<void> {
    try {
      const name = req.query.name as string;
      const products = await this.productUseCases.searchProducts(name);
      res.json(products);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }
}
