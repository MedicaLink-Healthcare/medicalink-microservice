const { PrismaClient } = require('./apps/provider-directory-service/prisma/generated/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.PROVIDER_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/medicalink_provider_directory?schema=public'
    }
  }
});

async function main() {
  const ids = ['cmnb8qw2b00f0vky0daasnyzp', 'cmnb8qw6n00fivky0ahuotbd4'];
  const doctors = await prisma.doctor.findMany({
    where: { id: { in: ids } }
  });
  console.log("Doctors found in Provider DB:", doctors.map(d => ({ id: d.id, fullName: d.fullName, isActive: d.isActive, staffAccountId: d.staffAccountId })));
  
  const { PrismaClient: AccountPrismaClient } = require('./apps/accounts-service/prisma/generated/client');
  const accountPrisma = new AccountPrismaClient({
    datasources: {
      db: {
        url: process.env.ACCOUNTS_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/medicalink_accounts?schema=public'
      }
    }
  });
  
  if (doctors.length > 0) {
      const accountIds = doctors.map(d => d.staffAccountId);
      const accounts = await accountPrisma.staffAccount.findMany({
          where: { id: { in: accountIds } }
      });
      console.log("Accounts found in Accounts DB:", accounts.map(a => ({ id: a.id, fullName: a.fullName, isActive: a.isActive })));
  }
}

main().catch(console.error).finally(() => process.exit(0));
