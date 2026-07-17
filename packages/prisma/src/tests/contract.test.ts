import { testStorageAdapterContract } from '@arxjs/core/testing';
import { afterAll } from 'vitest';
import { PrismaAdapter } from '../adapter';
import { PrismaClient } from './generated';

// Shared StorageAdapter conformance suite from @arxjs/core. Additive to
// adapter.test.ts, not a replacement — this is what catches contract
// violations (e.g. idempotency under concurrency) that dialect-specific
// tests may not think to check for.
const prisma = new PrismaClient();

afterAll(async () => {
  await prisma.$disconnect();
});

testStorageAdapterContract({
  create: () => new PrismaAdapter(prisma),
  reset: async () => {
    await prisma.userPermission.deleteMany();
    await prisma.userRole.deleteMany();
    await prisma.rolePermission.deleteMany();
    await prisma.permission.deleteMany();
    await prisma.role.deleteMany();
  },
});
