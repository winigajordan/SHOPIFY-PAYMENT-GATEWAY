// data-source.ts
import 'dotenv/config';
import { DataSource } from 'typeorm';

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,

  // Entities: correspond à ton DatabaseModule
  entities: [__dirname + '/src/**/*.entity{.ts,.js}'],

  // Migrations: adapte le chemin à l’emplacement réel de tes migrations
  migrations: [__dirname + '/src/database/migrations/*{.ts,.js}'],

  synchronize: false,
});
