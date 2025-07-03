import { StoreUseCases } from '../../application/use-cases/store.use-cases';

export class StoreController {
  constructor(private readonly storeUseCases: StoreUseCases) {}

  async createStore(req: any, res: any): Promise<void> {
    try {
      const store = await this.storeUseCases.createStore(req.body);
      res.status(201).json(store);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  async getStore(req: any, res: any): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const store = await this.storeUseCases.getStore(id);
      res.json(store);
    } catch (error) {
      res.status(404).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  async getAllStores(req: any, res: any): Promise<void> {
    try {
      const stores = await this.storeUseCases.getAllStores();
      res.json(stores);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  async updateStore(req: any, res: any): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const store = await this.storeUseCases.updateStore(id, req.body);
      res.json(store);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  async deleteStore(req: any, res: any): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      await this.storeUseCases.deleteStore(id);
      res.status(204).send();
    } catch (error) {
      res.status(404).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  async searchStores(req: any, res: any): Promise<void> {
    try {
      const name = req.query.name as string;
      const stores = await this.storeUseCases.searchStores(name);
      res.json(stores);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }
}
