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

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seeding...');

  try {
    // Clear existing data (optional - remove if you want to preserve data)
    console.log('Clearing existing data...');
    await prisma.cartItem.deleteMany();
    await prisma.cart.deleteMany();
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
        name: 'Downtown Electronics',
        address: '123 Main Street, Downtown, QC H1A 1A1',
      },
    });

    const store2 = await prisma.store.create({
      data: {
        name: 'Mall Tech Hub',
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
      prisma.product.create({
        data: {
          name: 'iPhone 15 Pro',
          price: 1299.99,
          description: 'Latest Apple smartphone with titanium design and advanced camera system',
        },
      }),
      prisma.product.create({
        data: {
          name: 'MacBook Air M3',
          price: 1499.99,
          description: '13-inch laptop with M3 chip, perfect for everyday computing',
        },
      }),
      prisma.product.create({
        data: {
          name: 'AirPods Pro 2nd Gen',
          price: 329.99,
          description: 'Premium wireless earbuds with active noise cancellation',
        },
      }),
      prisma.product.create({
        data: {
          name: 'iPad Air',
          price: 749.99,
          description: '10.9-inch tablet with M1 chip and Apple Pencil support',
        },
      }),
      prisma.product.create({
        data: {
          name: 'Apple Watch Series 9',
          price: 499.99,
          description: 'Advanced smartwatch with health monitoring and fitness tracking',
        },
      }),
      prisma.product.create({
        data: {
          name: 'Magic Keyboard',
          price: 199.99,
          description: 'Wireless keyboard with numeric keypad and Touch ID',
        },
      }),
      prisma.product.create({
        data: {
          name: 'Magic Mouse',
          price: 99.99,
          description: 'Multi-touch wireless mouse with sleek design',
        },
      }),
      prisma.product.create({
        data: {
          name: 'USB-C to Lightning Cable',
          price: 29.99,
          description: '1-meter cable for fast charging and data transfer',
        },
      }),
    ]);

    console.log(`Created ${products.length} products`);

    // 4. Create Stock for each product in each store
    console.log('Creating stock data...');
    const stores = [store1, store2, store3];
    
    for (const store of stores) {
      for (const product of products) {
        // Generate random stock quantities between 5 and 50
        const quantity = Math.floor(Math.random() * 46) + 5;
        
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

    // 5. Create sample carts for users
    console.log('Creating sample carts...');
    
    // Create cart for client user
    const clientCart = await prisma.cart.create({
      data: {
        userId: clientUser.id,
        items: {
          create: [
            {
              productId: products[0].id, // iPhone 15 Pro
              quantity: 1,
            },
            {
              productId: products[2].id, // AirPods Pro
              quantity: 2,
            },
          ],
        },
      },
    });

    console.log(`Created cart for ${clientUser.name} with ${await prisma.cartItem.count({ where: { cartId: clientCart.id } })} items`);

    // 6. Create sample sales
    console.log('Creating sample sales...');
    
    const sale1 = await prisma.sale.create({
      data: {
        storeId: store1.id,
        userId: clientUser.id,
        total: 1629.98, // iPhone + AirPods
        status: 'active',
        lines: {
          create: [
            {
              productId: products[0].id, // iPhone 15 Pro
              quantity: 1,
              unitPrice: products[0].price,
            },
            {
              productId: products[2].id, // AirPods Pro
              quantity: 1,
              unitPrice: products[2].price,
            },
          ],
        },
      },
    });

    
    console.log(`Created ${await prisma.sale.count()} sales transactions`);

    // 7. Create a sample refund
    console.log('Creating sample refund...');
    
    await prisma.refund.create({
      data: {
        saleId: sale1.id,
        storeId: store1.id,
        userId: clientUser.id,
        total: 329.99, // AirPods refund
        reason: 'Product defect - customer reported connectivity issues',
        lines: {
          create: [
            {
              productId: products[2].id, // AirPods Pro
              quantity: 1,
              unitPrice: products[2].price,
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
