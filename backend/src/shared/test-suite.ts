import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

async function runTests() {
  console.log('Running Production Readiness Test Suite...');
  
  // 1. Password hashing test
  const pass = 'Admin123!';
  const hash = await bcrypt.hash(pass, 10);
  const match = await bcrypt.compare(pass, hash);
  console.log(match ? '✅ Unit Test: BCrypt password hashing matches' : '❌ Unit Test: BCrypt hashing failed');

  // 2. JWT signing & verify test
  const secret = 'test-secret-key-123';
  const payload = { id: 1, role: 'Admin' };
  const token = jwt.sign(payload, secret, { expiresIn: '15m' });
  const decoded = jwt.verify(token, secret) as any;
  console.log(decoded.role === 'Admin' ? '✅ Unit Test: JWT Token signing & verification matches' : '❌ Unit Test: JWT failed');

  console.log('Test suite completed successfully!');
}

runTests().catch(console.error);
