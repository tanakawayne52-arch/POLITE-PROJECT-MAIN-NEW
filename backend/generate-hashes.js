import bcrypt from 'bcryptjs';

async function generateHashes() {
  const passwords = {
    admin: 'admin123',
    employee: 'emp123'
  };

  console.log('Generating bcrypt hashes...');
  
  for (const [user, password] of Object.entries(passwords)) {
    const hash = await bcrypt.hash(password, 10);
    console.log(`${user} password hash:`, hash);
  }
}

generateHashes().catch(console.error);
