/**
 * Database Seed File
 * 
 * This file seeds the database with initial mock data including:
 * - 2 users (client and admin roles)
 * - Sample stores
 * - Sample products
 * - Initial stock data
 * 
 * Usage: npm run seed or node prisma/seed.js
 */

import pkg from '@prisma/client';
const { PrismaClient } = pkg;
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seeding...');

  try {
    // Clear existing data (optional - remove if you want to preserve data)
    console.log('Clearing existing data...');
    await prisma.refundLine.deleteMany();
    await prisma.refund.deleteMany();
    await prisma.saleLine.deleteMany();
    await prisma.sale.deleteMany();
    await prisma.stock.deleteMany();
    await prisma.product.deleteMany();
    await prisma.store.deleteMany();
    await prisma.user.deleteMany();

    // Hash passwords for security
    const clientPassword = await bcrypt.hash('c', 10);
    const adminPassword = await bcrypt.hash('a', 10);

    // 1. Create Users (1 client, 1 admin)
    console.log('Creating users...');
    const clientUser = await prisma.user.create({
      data: {
        name: 'c',
        role: 'client',
        password: clientPassword,
      },
    });

    const adminUser = await prisma.user.create({
      data: {
        name: 'a',
        role: 'admin',
        password: adminPassword,
      },
    });

    console.log(`Created users: ${clientUser.name} (client), ${adminUser.name} (admin)`);

    // 2. Create Stores
    console.log('Creating stores...');
    const store1 = await prisma.store.create({
      data: {
        name: 'Downtown Store',
        address: '123 Main Street, Downtown, QC H1A 1A1',
      },
    });

    const store2 = await prisma.store.create({
      data: {
        name: 'Mall Store',
        address: '456 Shopping Center, Mall District, QC H2B 2B2',
      },
    });

    const store3 = await prisma.store.create({
      data: {
        name: 'Campus Store',
        address: '789 University Ave, Campus Area, QC H3C 3C3',
      },
    });

    console.log(`Created stores: ${store1.name}, ${store2.name}, ${store3.name}`);

    // 3. Create Products
    console.log('Creating products...');
    const products = await Promise.all([
      // Electronics
      prisma.product.create({
        data: {
          name: 'Wireless Headphones',
          price: 89.99,
          description: 'Comfortable over-ear wireless headphones with noise cancellation',
        },
      }),
      prisma.product.create({
        data: {
          name: 'Smartphone 128GB',
          price: 599.99,
          description: 'Latest smartphone with high-resolution camera and fast processor',
        },
      }),
      prisma.product.create({
        data: {
          name: 'Laptop 15-inch',
          price: 899.99,
          description: '15-inch laptop with SSD storage and 8GB RAM',
        },
      }),
      prisma.product.create({
        data: {
          name: 'Wireless Mouse',
          price: 29.99,
          description: 'Ergonomic wireless mouse with long battery life',
        },
      }),
      prisma.product.create({
        data: {
          name: 'Bluetooth Speaker',
          price: 49.99,
          description: 'Portable Bluetooth speaker with premium sound quality',
        },
      }),
      // Home & Garden
      prisma.product.create({
        data: {
          name: 'Coffee Maker',
          price: 79.99,
          description: 'Programmable coffee maker with 12-cup capacity',
        },
      }),
      prisma.product.create({
        data: {
          name: 'Air Purifier',
          price: 159.99,
          description: 'HEPA air purifier for rooms up to 300 sq ft',
        },
      }),
      prisma.product.create({
        data: {
          name: 'LED Desk Lamp',
          price: 34.99,
          description: 'Adjustable LED desk lamp with USB charging port',
        },
      }),
      prisma.product.create({
        data: {
          name: 'Plant Pot Set',
          price: 24.99,
          description: 'Set of 3 ceramic plant pots with drainage holes',
        },
      }),
      prisma.product.create({
        data: {
          name: 'Kitchen Scale',
          price: 19.99,
          description: 'Digital kitchen scale with precision measurements',
        },
      }),
      // Clothing & Accessories
      prisma.product.create({
        data: {
          name: 'Cotton T-Shirt',
          price: 14.99,
          description: '100% cotton t-shirt available in multiple colors',
        },
      }),
      prisma.product.create({
        data: {
          name: 'Denim Jeans',
          price: 59.99,
          description: 'Classic fit denim jeans with comfort stretch',
        },
      }),
      prisma.product.create({
        data: {
          name: 'Running Shoes',
          price: 89.99,
          description: 'Lightweight running shoes with cushioned sole',
        },
      }),
      prisma.product.create({
        data: {
          name: 'Leather Wallet',
          price: 39.99,
          description: 'Genuine leather wallet with RFID blocking technology',
        },
      }),
      prisma.product.create({
        data: {
          name: 'Baseball Cap',
          price: 19.99,
          description: 'Adjustable baseball cap with embroidered logo',
        },
      }),
      // Sports & Fitness
      prisma.product.create({
        data: {
          name: 'Yoga Mat',
          price: 29.99,
          description: 'Non-slip yoga mat with carrying strap',
        },
      }),
      prisma.product.create({
        data: {
          name: 'Water Bottle',
          price: 16.99,
          description: 'Insulated stainless steel water bottle 32oz',
        },
      }),
      prisma.product.create({
        data: {
          name: 'Resistance Bands Set',
          price: 24.99,
          description: 'Set of 5 resistance bands with different resistance levels',
        },
      }),
      // Books & Media
      prisma.product.create({
        data: {
          name: 'Programming Book',
          price: 44.99,
          description: 'Comprehensive guide to modern programming languages',
        },
      }),
      prisma.product.create({
        data: {
          name: 'Notebook Set',
          price: 12.99,
          description: 'Set of 3 lined notebooks for writing and journaling',
        },
      }),
    ]);

    console.log(`Created ${products.length} products`);

    // 4. Create Stock for each product in each store
    console.log('Creating stock data...');
    const stores = [store1, store2, store3];
    
    for (const store of stores) {
      for (const product of products) {
        // Generate random stock quantities between 0 and 100
        // Some products might be out of stock (0), others well-stocked
        const quantity = Math.floor(Math.random() * 101);
        
        await prisma.stock.create({
          data: {
            storeId: store.id,
            productId: product.id,
            quantity: quantity,
          },
        });
      }
    }

    console.log('Created stock data for all products in all stores');

    // 5. Create sample sales
    console.log('Creating sample sales...');
    
    const sale1 = await prisma.sale.create({
      data: {
        storeId: store1.id,
        userId: clientUser.id,
        total: 739.97, // Smartphone + Wireless Headphones + Bluetooth Speaker
        status: 'active',
        lines: {
          create: [
            {
              productId: products[1].id, // Smartphone 128GB
              quantity: 1,
              unitPrice: products[1].price,
            },
            {
              productId: products[0].id, // Wireless Headphones
              quantity: 1,
              unitPrice: products[0].price,
            },
            {
              productId: products[4].id, // Bluetooth Speaker
              quantity: 1,
              unitPrice: products[4].price,
            },
          ],
        },
      },
    });

    console.log(`Created ${await prisma.sale.count()} sales transactions`);

    // 6. Create a sample refund
    console.log('Creating sample refund...');
    
    await prisma.refund.create({
      data: {
        saleId: sale1.id,
        storeId: store1.id,
        userId: clientUser.id,
        total: 49.99, // Bluetooth Speaker refund
        reason: 'Product defect - customer reported poor sound quality',
        lines: {
          create: [
            {
              productId: products[4].id, // Bluetooth Speaker
              quantity: 1,
              unitPrice: products[4].price,
            },
          ],
        },
      },
    });

    console.log('Created sample refund');

    // Update sale status to partially refunded
    await prisma.sale.update({
      where: { id: sale1.id },
      data: { status: 'partially_refunded' },
    });

    console.log('Database seeding completed successfully!');
    
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
