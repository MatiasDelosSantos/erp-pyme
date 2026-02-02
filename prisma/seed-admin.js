require('dotenv').config();
const { PrismaClient } = require('../src/generated/prisma');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Creando usuario administrador...');

  const hashedPassword = await bcrypt.hash('admin123', 10);

  const admin = await prisma.usuario.upsert({
    where: { email: 'admin@erp.local' },
    update: {
      passwordHash: hashedPassword,
      nombre: 'Administrador',
      rol: 'admin',
      activo: true,
    },
    create: {
      email: 'admin@erp.local',
      passwordHash: hashedPassword,
      nombre: 'Administrador',
      rol: 'admin',
      activo: true,
    },
  });

  console.log('');
  console.log('==========================================');
  console.log('  Usuario admin creado/actualizado');
  console.log('==========================================');
  console.log(`  Email:      ${admin.email}`);
  console.log('  Password:   admin123');
  console.log(`  Rol:        ${admin.rol}`);
  console.log('==========================================');
  console.log('');
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
