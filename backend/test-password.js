import bcrypt from 'bcryptjs';

async function testPassword() {
  const password = 'emp123';
  const hash = '$2a$10$rE5fGIMAboWD7KR0mb2IZuJMZ94iQ6NYWCLOirnU4E4KZF7sFcePu';
  
  const isMatch = await bcrypt.compare(password, hash);
  console.log('Password "emp123" matches hash:', isMatch);
  
  const adminPassword = 'admin123';
  const adminHash = '$2a$10$LN3E0AWwKL4Mr.AfgaRXvuOGpWriafiHkoTgf2THiA4ilCale8D1.';
  const adminMatch = await bcrypt.compare(adminPassword, adminHash);
  console.log('Password "admin123" matches hash:', adminMatch);
}

testPassword();
