import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // Upsert Settings
  await prisma.settings.upsert({
    where: { id: 'settings' },
    update: {},
    create: {
      id: 'settings',
      siteName: '화니 OTT',
      siteDescription: '화니오티티 - 프리미엄 상품 판매 스토어',
      bankName: '미설정',
      bankAccount: '미설정',
      accountHolder: '미설정',
    },
  });

  console.log('✓ Settings seeded');

  // Upsert Tier Configs
  const tiers = [
    { tier: Role.USER, minPurchase: 0, discountRate: 0, benefits: '기본 회원', order: 1 },
    { tier: Role.SILVER, minPurchase: 100000, discountRate: 3, benefits: '3% 할인 혜택', order: 2 },
    { tier: Role.GOLD, minPurchase: 500000, discountRate: 5, benefits: '5% 할인 혜택', order: 3 },
    { tier: Role.PLATINUM, minPurchase: 1000000, discountRate: 7, benefits: '7% 할인 혜택 + 우선 배송', order: 4 },
    { tier: Role.DIAMOND, minPurchase: 5000000, discountRate: 10, benefits: '10% 할인 혜택 + VIP 전용 상품', order: 5 },
  ];

  for (const config of tiers) {
    await prisma.tierConfig.upsert({
      where: { tier: config.tier },
      update: {
        minPurchase: config.minPurchase,
        discountRate: config.discountRate,
        benefits: config.benefits,
        order: config.order,
      },
      create: config,
    });
  }

  console.log('✓ Tier configs seeded');
  console.log('Seed complete!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
