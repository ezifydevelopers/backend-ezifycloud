import { PrismaClient, BoardType, ColumnType, WorkspaceRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Ensure an admin user exists
  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@example.com';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'Password123!';

  let admin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!admin) {
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    admin = await prisma.user.create({
      data: {
        name: 'Admin User',
        email: adminEmail,
        passwordHash,
        role: 'admin',
        isActive: true,
      },
    });
    console.log(`✅ Created admin user ${adminEmail} (password: ${adminPassword})`);
  } else {
    console.log(`ℹ️ Using existing admin user ${adminEmail}`);
  }

  // Create workspace
  const workspace = await prisma.workspace.upsert({
    where: { slug: 'acme-corp' },
    update: {},
    create: {
      name: 'Acme Corp',
      slug: 'acme-corp',
      description: 'Demo workspace for invoices',
      settings: {
        timezone: 'UTC',
        currency: 'USD',
        language: 'en',
      },
      createdBy: admin.id,
      members: {
        create: [{ userId: admin.id, role: WorkspaceRole.owner }],
      },
    },
    include: { members: true },
  });
  console.log(`✅ Workspace ready: ${workspace.name}`);

  // Create an Invoices board with some columns
  const board = await prisma.board.create({
    data: {
      workspaceId: workspace.id,
      name: 'Invoices - Demo',
      type: BoardType.invoices,
      description: 'Sample invoices board',
      color: '#6d28d9',
      icon: 'receipt',
      settings: { statusOptions: ['Draft', 'Sent', 'Paid', 'Overdue'] },
      columns: {
        create: [
          { name: 'Status', type: ColumnType.STATUS, position: 1, settings: { options: ['Draft','Sent','Paid','Overdue'] } },
          { name: 'Invoice #', type: ColumnType.TEXT, position: 2 },
          { name: 'Client', type: ColumnType.TEXT, position: 3 },
          { name: 'Amount', type: ColumnType.CURRENCY, position: 4 },
          { name: 'Due Date', type: ColumnType.DATE, position: 5 },
        ],
      },
    },
    include: { columns: true },
  });
  console.log(`✅ Board created: ${board.name}`);

  const colByName = (name: string) => board.columns.find(c => c.name === name)!;

  // Seed items with cells
  const itemsData = [
    { name: 'Invoice A-1001', status: 'Sent', invoice: 'A-1001', client: 'Globex', amount: 1250, due: addDays(10) },
    { name: 'Invoice A-1002', status: 'Paid', invoice: 'A-1002', client: 'Initech', amount: 890, due: addDays(-2) },
    { name: 'Invoice A-1003', status: 'Overdue', invoice: 'A-1003', client: 'Umbrella', amount: 2300, due: addDays(-15) },
    { name: 'Invoice A-1004', status: 'Draft', invoice: 'A-1004', client: 'Soylent', amount: 410, due: addDays(20) },
  ];

  for (const row of itemsData) {
    const item = await prisma.item.create({
      data: {
        boardId: board.id,
        name: row.name,
        status: row.status,
        createdBy: admin.id,
      },
    });

    await prisma.cell.createMany({
      data: [
        { itemId: item.id, columnId: colByName('Status').id, value: row.status as any },
        { itemId: item.id, columnId: colByName('Invoice #').id, value: row.invoice as any },
        { itemId: item.id, columnId: colByName('Client').id, value: row.client as any },
        { itemId: item.id, columnId: colByName('Amount').id, value: row.amount as any },
        { itemId: item.id, columnId: colByName('Due Date').id, value: row.due.toISOString().split('T')[0] as any },
      ],
    });
  }
  console.log(`✅ Seeded ${itemsData.length} invoice items`);
}

function addDays(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}
main()
  .then(async () => {
    await prisma.$disconnect();
    console.log('🌱 Seed complete');
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
