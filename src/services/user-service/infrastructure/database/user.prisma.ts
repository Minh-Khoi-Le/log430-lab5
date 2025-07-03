// This file contains the Prisma schema for the User entity in the user service. 
// It defines the structure of the User model and its relationships.

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const userPrismaSchema = {
  model: {
    User: {
      id: {
        type: 'Int',
        id: true,
        default: { autoincrement: true },
      },
      name: {
        type: 'String',
        unique: true,
        map: 'name',
      },
      role: {
        type: 'String',
        default: 'client',
      },
      password: {
        type: 'String',
        default: 'password',
      },
      sales: {
        type: 'Sale[]',
      },
      refunds: {
        type: 'Refund[]',
      },
    },
  },
};

export default prisma;