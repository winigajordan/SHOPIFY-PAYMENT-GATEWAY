import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const db = config.get('database');
        return {
          type: 'postgres' as const,
          host: db.host,
          port: db.port,
          username: db.user,
          password: db.pass,
          database: db.name,
          entities: [__dirname + '/../**/*.entity{.ts,.js}'],
          synchronize: false, // à activer en dev si tu veux, mais pas en prod
        };
      },
    }),
  ],
})
export class DatabaseModule {}
