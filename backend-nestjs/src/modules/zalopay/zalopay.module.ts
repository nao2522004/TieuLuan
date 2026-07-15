import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ZaloPayService } from './zalopay.service';
import { ZaloPayController } from './zalopay.controller';
import { Return } from '../returns/entities/return.entity';
import { ProductsModule } from '../products/products.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    ConfigModule,
    HttpModule,
    TypeOrmModule.forFeature([Return]),
    ProductsModule,
    JwtModule.register({}),
    UsersModule,
  ],
  controllers: [ZaloPayController],
  providers: [ZaloPayService],
  exports: [ZaloPayService],
})
export class ZaloPayModule {}
