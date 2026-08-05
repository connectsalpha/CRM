import dotenv from 'dotenv';
dotenv.config();

const REQUIRED_ENV_VARS = [
  'DATABASE_URL',
  'JWT_SECRET',
];

export const validateEnv = () => {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.error('==================================================');
    console.error('FATAL STARTUP ERROR: Missing required environment variables:');
    missing.forEach((key) => console.error(`  - ${key}`));
    console.error('Please configure these variables in your .env file.');
    console.error('==================================================');
    process.exit(1);
  }
};
