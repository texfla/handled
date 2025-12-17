import 'dotenv/config';
import { defineConfig } from '@prisma/config';

export default defineConfig({
  schema: './prisma/schema-data.prisma',
  datasource: {
    url: process.env.DATA_DATABASE_URL || process.env.PRIMARY_DATABASE_URL,
  },
});
