// src/customers/customers.service.ts
import { 
    Injectable, 
    NotFoundException, 
    BadRequestException,
    Logger,
  } from '@nestjs/common';
  import { InjectRepository } from '@nestjs/typeorm';
  import { Repository } from 'typeorm';
  import { Customer } from './entities/customer.entity';
  import { CreateCustomerDto } from './dto/create-customer.dto';
  import { ShopifyStore } from '../shopify/entities/shopify-store.entity';
  
  @Injectable()
  export class CustomersService {
    
    private readonly logger = new Logger(CustomersService.name);
  
    constructor(
      @InjectRepository(Customer)
      private readonly customerRepository: Repository<Customer>,
    ) {}
  
    /**
     * Créer un customer
     */
    async create(dto: CreateCustomerDto, store: ShopifyStore): Promise<Customer> {
      // Validation métier
      if (!dto.email && !dto.phoneNumber) {
        throw new BadRequestException('Customer must have at least email or phone number');
      }
  
      // Vérifier si existe déjà
      const existing = await this.customerRepository.findOne({
        where: { shopifyCustomerId: dto.shopifyCustomerId },
      });
  
      if (existing) {
        this.logger.warn(`Customer ${dto.shopifyCustomerId} already exists`);
        return existing;
      }
  
      const customer = this.customerRepository.create({
        ...dto,
        store, // ← Passer l'objet store directement
      });
  
      return this.customerRepository.save(customer);
    }
  
    /**
     * Trouver ou créer un customer depuis un webhook Shopify
     */
    async findOrCreateFromShopify(
      shopifyCustomer: any,
      phoneNumber: string | null,
      email: string | null,
      store: ShopifyStore,
    ): Promise<Customer> {
      // Validation : au moins un contact
      if (!phoneNumber && !email) {
        throw new BadRequestException(
          'Customer must have at least email or phone number',
        );
      }
  
      const shopifyCustomerId = String(shopifyCustomer.id);
  
      // Chercher si existe déjà
      let customer = await this.customerRepository.findOne({
        where: { shopifyCustomerId },
      });
  
      if (customer) {
        this.logger.log(`Customer found: ${shopifyCustomerId}`);
  
        // Mettre à jour les infos si changées
        let updated = false;
  
        if (email && customer.email !== email) {
          customer.email = email;
          updated = true;
        }
  
        if (phoneNumber && customer.phoneNumber !== phoneNumber) {
          customer.phoneNumber = phoneNumber;
          updated = true;
        }
  
        if (shopifyCustomer.first_name && customer.firstName !== shopifyCustomer.first_name) {
          customer.firstName = shopifyCustomer.first_name;
          updated = true;
        }
  
        if (shopifyCustomer.last_name && customer.lastName !== shopifyCustomer.last_name) {
          customer.lastName = shopifyCustomer.last_name;
          updated = true;
        }
  
        if (updated) {
          customer = await this.customerRepository.save(customer);
          this.logger.log(`Customer updated: ${shopifyCustomerId}`);
        }
  
        return customer;
      }
  
      // Créer un nouveau customer
      this.logger.log(`Creating new customer: ${shopifyCustomerId}`);
  
      const newCustomer = this.customerRepository.create({
        shopifyCustomerId,
        email: email || null,
        phoneNumber: phoneNumber || null,
        firstName: shopifyCustomer.first_name || 'Unknown',
        lastName: shopifyCustomer.last_name || 'Unknown',
        store, // ← Passer l'objet store directement
      });
  
      return this.customerRepository.save(newCustomer);
    }
  
    /**
     * Trouver par ID Shopify
     */
    async findByShopifyId(shopifyCustomerId: string): Promise<Customer> {
      const customer = await this.customerRepository.findOne({
        where: { shopifyCustomerId },
        relations: ['store'],
      });
  
      if (!customer) {
        throw new NotFoundException(`Customer with Shopify ID ${shopifyCustomerId} not found`);
      }
  
      return customer;
    }
  
    /**
     * Trouver par ID interne
     */
    async findOne(id: string): Promise<Customer> {
      const customer = await this.customerRepository.findOne({
        where: { id },
        relations: ['store'],
      });
  
      if (!customer) {
        throw new NotFoundException(`Customer with ID ${id} not found`);
      }
  
      return customer;
    }
  
    /**
     * Trouver par téléphone
     */
    async findByPhone(phoneNumber: string): Promise<Customer | null> {
      return this.customerRepository.findOne({
        where: { phoneNumber },
        relations: ['store'],
      });
    }
  
    /**
     * Trouver par email
     */
    async findByEmail(email: string): Promise<Customer | null> {
      return this.customerRepository.findOne({
        where: { email },
        relations: ['store'],
      });
    }
  
    /**
     * Récupérer tous les customers
     */
    async findAll(): Promise<Customer[]> {
      return this.customerRepository.find({
        relations: ['store'],
        order: { createdAt: 'DESC' },
      });
    }
  }