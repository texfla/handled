import 'dotenv/config';
import { defineConfig } from '@prisma/config';

export default defineConfig({
  schema: './prisma/schema-primary.prisma',
  datasource: {
    url: process.env.PRIMARY_DATABASE_URL,
  },
});
