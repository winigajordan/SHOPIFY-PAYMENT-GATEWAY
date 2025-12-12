// src/customers/dto/create-customer.dto.ts
import { 
    IsNotEmpty, 
    IsString, 
    IsEmail, 
    IsOptional, 
    ValidateIf,
  } from 'class-validator';
  
  export class CreateCustomerDto {
    @IsNotEmpty()
    @IsString()
    shopifyCustomerId: string;
  
    @IsOptional()
    @IsEmail()
    @ValidateIf((o) => !o.phoneNumber)
    email?: string;
  
    @IsOptional()
    @IsString()
    @ValidateIf((o) => !o.email)
    phoneNumber?: string;
  
    @IsNotEmpty()
    @IsString()
    firstName: string;
  
    @IsNotEmpty()
    @IsString()
    lastName: string;
  
  }