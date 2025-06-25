import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const products = [
  { name: "Baguette", price: 2.99, description: "Classic French bread" },
  { name: "Cheese", price: 7.99, description: "Artisanal aged cheese" },
  { name: "Ham", price: 4.29, description: "Premium quality ham" },
  { name: "Milk", price: 3.49, description: "Fresh whole milk" },
  { name: "Eggs", price: 3.99, description: "Organic free-range eggs" },
  { name: "Tomato", price: 2.19, description: "Ripe red tomatoes" },
  { name: "Butter", price: 5.49, description: "Artisanal unsalted butter" },
  { name: "Apple", price: 1.59, description: "Crisp apples" },
  { name: "Pepper", price: 1.99, description: "Ground black pepper" },
  { name: "Chocolate", price: 3.79, description: "Dark chocolate 70% cocoa" },
];

const stores = [
  { name: "Store A", address: "1 Paris Street" },
  { name: "Store B", address: "2 Lyon Avenue" },
  { name: "Store C", address: "3 Lille Boulevard" },
  { name: "Store D", address: "4 Bordeaux Square" },
  { name: "Store E", address: "5 Nice Lane" },
];

// Users with different roles
const users = [
  { name: "g", role: "gestionnaire", password: "g" },
  { name: "c", role: "client", password: "c" },
  { name: "Alice", role: "client", password: "password" },
  { name: "Bob", role: "client", password: "password" },
];

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function main() {
  try {
    console.log("Starting database cleanup...");
    
    // Delete all data in the correct order based on schema relationships
    // 1. Delete RefundLine (child of Refund)
    await prisma.refundLine.deleteMany({});
    console.log("Deleted refundLine records");
    
    // 2. Delete SaleLine (child of Sale)
    await prisma.saleLine.deleteMany({});
    console.log("Deleted saleLine records");
    
    // 3. Delete Refund (dependent on Sale, Store, User)
    await prisma.refund.deleteMany({});
    console.log("Deleted refund records");
    
    // 4. Delete Sale (dependent on Store, User)
    await prisma.sale.deleteMany({});
    console.log("Deleted sale records");
    
    // 5. Delete Stock (dependent on Store, Product)
    await prisma.stock.deleteMany({});
    console.log("Deleted stock records");
    
    // 6. Delete parent tables
    await prisma.store.deleteMany({});
    console.log("Deleted store records");
    
    await prisma.product.deleteMany({});
    console.log("Deleted product records");
    
    await prisma.user.deleteMany({});
    console.log("Deleted user records");

    console.log("Database cleanup completed successfully.");

    // Insert products, stores and users
    await prisma.product.createMany({ data: products });
    await prisma.store.createMany({ data: stores });
    await prisma.user.createMany({ data: users });

    // Get the products, stores and users inserted
    const productsList = await prisma.product.findMany();
    const storesList = await prisma.store.findMany();
    const clientsList = await prisma.user.findMany({ where: { role: 'client' } });

    // Create stocks for each product X store
    for (const store of storesList) {
      for (const product of productsList) {
        await prisma.stock.create({
          data: {
            productId: product.id,
            storeId: store.id,
            quantity: getRandomInt(20, 100) // random stock
          }
        });
      }
    }

    // Generate random sales for each store
    for (const store of storesList) {
      const nbSales = getRandomInt(5, 10); // 5 to 10 sales per store
      for (let v = 0; v < nbSales; v++) {
        // Random client among the users with role 'client'
        const client = clientsList[getRandomInt(0, clientsList.length - 1)];
        // 1 to 4 different products per sale
        const chosenProducts = [...productsList]
          .sort(() => Math.random() - 0.5)
          .slice(0, getRandomInt(1, 4));

        // Generate sale lines
        const lines = chosenProducts.map(product => ({
          productId: product.id,
          quantity: getRandomInt(1, 5),
          unitPrice: product.price
        }));

        // Calculate the total of the sale
        const total = lines.reduce((acc, l) => acc + l.quantity * l.unitPrice, 0);

        // Create the sale with its associated lines
        await prisma.sale.create({
          data: {
            storeId: store.id,
            userId: client.id,
            total,
            lines: {
              create: lines
            }
          }
        });
      }
    }

    console.log("Data seeded (products, stores, stocks, users, sales)!");
  } catch (error) {
    console.error("Error during seeding:", error);
    throw error;
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
