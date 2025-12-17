import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prismaPrimary } from '../db';
import { checkEvidentaryValue } from '../services/usage-detection.js';

const organizationSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  status: z.enum(['prospect', 'setup', 'active', 'paused', 'terminated']).optional(),
});

const warehouseAllocationSchema = z.object({
  company_warehouse_id: z.string(),
  is_primary: z.boolean().optional(),
  space_allocated: z.object({
    pallets: z.number().optional(),
    sqft: z.number().optional(),
  }).optional(),
  zone_assignment: z.string().optional(),
  status: z.enum(['active', 'setup', 'inactive']).optional(),
  notes: z.string().optional(),
});

const customerFacilitySchema = z.object({
  name: z.string().min(1),
  facility_type: z.enum(['warehouse', 'manufacturing', 'retail', 'office', 'other']).optional(),
  address: z.object({
    street1: z.string(),
    street2: z.string().optional(),
    city: z.string(),
    state: z.string(),
    zip: z.string(),
    country: z.string(),
  }),
  is_source: z.boolean().optional(),
  is_destination: z.boolean().optional(),
  notes: z.string().optional(),
});

const contactSchema = z.object({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  title: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  role: z.enum(['operations', 'billing', 'executive', 'technical', 'general']).optional(),
  is_primary: z.boolean().optional(),
  notes: z.string().optional(),
});

const contractSchema = z.object({
  contract_number: z.string().optional(),
  name: z.string().min(1),
  start_date: z.string(), // Will be converted to Date
  end_date: z.string().optional(),
  auto_renew: z.boolean().optional(),
  status: z.enum(['draft', 'active', 'expired', 'terminated']).optional(),
  billing_cycle: z.enum(['monthly', 'weekly', 'per_order', 'custom']).optional(),
  payment_terms: z.string().optional(),
  notes: z.string().optional(),
});

const rateCardSchema = z.object({
  contract_id: z.string(),
  name: z.string().min(1),
  effective_date: z.string(),
  expiration_date: z.string().optional(),
  version: z.number().optional(),
  supersedes_id: z.string().optional(),
  rates: z.record(z.number()),
  is_active: z.boolean().optional(),
  notes: z.string().optional(),
});

export const clientsRoutes: FastifyPluginAsync = async (fastify) => {
  // ============================================
  // ORGANIZATIONS (Clients)
  // ============================================

  // Check slug availability
  fastify.get('/check-slug/:slug', async (request, reply) => {
    const { slug } = request.params as { slug: string };
    
    const existing = await prismaPrimary.customer.findUnique({
      where: { slug },
      select: { id: true },
    });

    return reply.send({ available: !existing });
  });

  // List clients
  fastify.get('/', async (request) => {
    const { status } = request.query as { status?: string };
    
    const clients = await prismaPrimary.customer.findMany({
      where: { 
        deleted: false,  // Exclude soft-deleted
        ...(status && { status })
      },
      include: {
        _count: {
          select: {
            warehouseAllocations: true,
            facilities: true,
            contacts: { where: { active: true } },
            contracts: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return { clients };
  });

  // Get client by ID
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const client = await prismaPrimary.customer.findUnique({
      where: { id },
      include: {
        warehouseAllocations: {
          include: {
            warehouse: {
              select: { id: true, code: true, name: true },
            },
          },
        },
        facilities: true,
        contacts: {
          where: { active: true },
          orderBy: [{ isPrimary: 'desc' }, { lastName: 'asc' }],
        },
        contracts: {
          include: {
            rateCards: {
              where: { isActive: true },
            },
          },
        },
        settings: true,
      },
    });

    if (!client) {
      return reply.status(404).send({ error: 'Client not found' });
    }

    return { client };
  });

  // Create client
  fastify.post('/', async (request, reply) => {
    const body = organizationSchema.parse(request.body);

    try {
      const client = await prismaPrimary.customer.create({
        data: {
          name: body.name,
          slug: body.slug,
          status: body.status || 'prospect',
          setupProgress: {},
        },
      });

      return reply.status(201).send({ client });
    } catch (error: any) {
      // Handle Prisma unique constraint errors
      if (error.code === 'P2002') {
        const field = error.meta?.target?.[0] || 'field';
        return reply.code(409).send({
          error: `A client with this ${field} already exists. Please use a different ${field}.`,
        });
      }
      throw error;
    }
  });

  // Update client
  fastify.put('/:id', async (request) => {
    const { id } = request.params as { id: string };
    const body = organizationSchema.partial().parse(request.body);

    const client = await prismaPrimary.customer.update({
      where: { id },
      data: body,
    });

    return { client };
  });

  // Delete client - Smart delete with lifecycle awareness
  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { reason } = (request.body || {}) as { reason?: string };

    const valueCheck = await checkEvidentaryValue('customer', id);

    if (valueCheck.hasValue) {
      return reply.status(409).send({
        error: 'Cannot delete customer with history',
        reason: valueCheck.reason,
        details: valueCheck.details,
        suggestion: {
          action: 'terminate',
          message: 'This customer has business history. Please terminate the relationship instead.',
          endpoint: `PATCH /api/clients/${id}`,
          payload: { 
            status: 'terminated',
            retiredReason: reason || 'Customer relationship ended'
          }
        }
      });
    }

    // Safe to soft-delete
    await prismaPrimary.customer.update({
      where: { id },
      data: {
        deleted: true,
        deletedAt: new Date(),
        deletedBy: (request as any).user?.id || null,
        deletedReason: reason || 'Test/abandoned customer - safe to purge'
      }
    });

    return reply.status(204).send();
  });

  // Terminate customer relationship - Preserve forever
  fastify.post('/:id/terminate', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { reason } = request.body as { reason: string };

    if (!reason || reason.trim().length < 10) {
      return reply.status(400).send({
        error: 'Termination reason required',
        message: 'Please provide a detailed reason for termination (minimum 10 characters)'
      });
    }

    const customer =     await prismaPrimary.customer.update({
      where: { id },
      data: {
        status: 'terminated',
        retiredAt: new Date(),
        retiredBy: (request as any).user?.id || null,
        retiredReason: reason.trim()
      }
    });

    return reply.send({ 
      message: 'Customer relationship terminated successfully',
      customer 
    });
  });

  // ============================================
  // WAREHOUSE ALLOCATIONS (Client space at YOUR warehouses)
  // ============================================

  // List client warehouse allocations
  fastify.get('/:id/warehouse-allocations', async (request) => {
    const { id } = request.params as { id: string };

    const allocations = await prismaPrimary.warehouseAllocation.findMany({
      where: { customerId: id },
      include: {
        warehouse: {
          select: { id: true, code: true, name: true, capacity: true },
        },
      },
    });

    return { allocations };
  });

  // Create warehouse allocation with capacity validation
  fastify.post('/:id/warehouse-allocations', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = warehouseAllocationSchema.parse(request.body);

    // CRITICAL: Validate warehouse capacity before allocation
    const warehouse = await prismaPrimary.warehouse.findUnique({
      where: { id: body.company_warehouse_id },
      include: {
        warehouseAllocations: {
          select: { spaceAllocated: true }
        }
      }
    });

    if (!warehouse) {
      return reply.status(404).send({ error: 'Warehouse not found' });
    }

    // Calculate used capacity
    const usedPallets = warehouse.warehouseAllocations.reduce((sum, a) => {
      return sum + ((a.spaceAllocated as any)?.pallets || 0);
    }, 0);

    const requestedPallets = body.space_allocated?.pallets || 0;
    const totalCapacity = (warehouse.capacity as any)?.usable_pallets || Infinity;
    const availablePallets = totalCapacity - usedPallets;

    if (requestedPallets > 0 && requestedPallets > availablePallets) {
      return reply.status(400).send({
        error: 'Insufficient warehouse capacity',
        details: `Requested ${requestedPallets} pallets, only ${availablePallets} available`,
        warehouseId: warehouse.id,
        warehouseCode: warehouse.code,
        totalCapacity: totalCapacity === Infinity ? 'unlimited' : totalCapacity,
        currentlyUsed: usedPallets,
        available: availablePallets === Infinity ? 'unlimited' : availablePallets
      });
    }

    // Proceed with warehouse allocation creation
    const allocation = await prismaPrimary.warehouseAllocation.create({
      data: {
        customerId: id,
        companyWarehouseId: body.company_warehouse_id,
        isPrimary: body.is_primary || false,
        spaceAllocated: body.space_allocated || {},
        zoneAssignment: body.zone_assignment || null,
        status: body.status || 'active',
        notes: body.notes || null,
      },
    });

    return reply.status(201).send({ allocation });
  });

  // Update warehouse allocation
  fastify.put('/:id/warehouse-allocations/:allocationId', async (request, reply) => {
    const { allocationId } = request.params as { id: string; allocationId: string };
    const body = warehouseAllocationSchema.partial().parse(request.body);

    // Get current allocation
    const allocation = await prismaPrimary.warehouseAllocation.findUnique({
      where: { id: allocationId },
      include: { warehouse: { include: { warehouseAllocations: true } } }
    });

    if (!allocation) {
      return reply.status(404).send({ error: 'Warehouse allocation not found' });
    }

    // Determine which warehouse to validate against
    const isChangingWarehouse = body.company_warehouse_id && body.company_warehouse_id !== allocation.companyWarehouseId;

    // If warehouse is changing, fetch the new warehouse
    let targetWarehouse = allocation.warehouse;
    if (isChangingWarehouse) {
      const newWarehouse = await prismaPrimary.warehouse.findUnique({
        where: { id: body.company_warehouse_id },
        include: { warehouseAllocations: true }
      });

      if (!newWarehouse) {
        return reply.status(404).send({ error: 'Target warehouse not found' });
      }

      targetWarehouse = newWarehouse;
    }

    // Validate capacity if space allocation is being updated or warehouse is changing
    if (body.space_allocated || isChangingWarehouse) {
      const requestedPallets = (body.space_allocated?.pallets ?? (allocation.spaceAllocated as any)?.pallets) || 0;
      
      // Calculate used capacity in target warehouse
      const usedPallets = targetWarehouse.warehouseAllocations
        .filter(a => isChangingWarehouse ? true : a.id !== allocationId) // If changing warehouse, count all allocations; otherwise exclude current
        .reduce((sum, a) => sum + ((a.spaceAllocated as any)?.pallets || 0), 0);

      const totalCapacity = (targetWarehouse.capacity as any)?.usable_pallets || Infinity;
      const availablePallets = totalCapacity - usedPallets;

      // If changing warehouse, we need to check if the new warehouse has capacity
      // If not changing warehouse, only check if we're increasing allocation
      const currentPallets = (allocation.spaceAllocated as any)?.pallets || 0;
      const isIncreasing = requestedPallets > currentPallets;

      if (requestedPallets > 0 && (isChangingWarehouse || isIncreasing)) {
        if (requestedPallets > availablePallets) {
          return reply.status(400).send({
            error: 'Insufficient warehouse capacity',
            details: `Requested ${requestedPallets} pallets, only ${availablePallets} available`,
            warehouseId: targetWarehouse.id,
            warehouseCode: targetWarehouse.code,
            totalCapacity: totalCapacity === Infinity ? 'unlimited' : totalCapacity,
            currentlyUsed: usedPallets,
            available: availablePallets === Infinity ? 'unlimited' : availablePallets
          });
        }
      }
    }

    const updated = await prismaPrimary.warehouseAllocation.update({
      where: { id: allocationId },
      data: {
        ...(body.company_warehouse_id && { companyWarehouseId: body.company_warehouse_id }),
        ...(body.is_primary !== undefined && { isPrimary: body.is_primary }),
        ...(body.space_allocated && { spaceAllocated: body.space_allocated }),
        ...(body.zone_assignment !== undefined && { zoneAssignment: body.zone_assignment }),
        ...(body.status && { status: body.status }),
        ...(body.notes !== undefined && { notes: body.notes }),
      },
    });

    return { allocation: updated };
  });

  // Delete warehouse allocation
  fastify.delete('/:id/warehouse-allocations/:allocationId', async (request, reply) => {
    const { allocationId } = request.params as { id: string; allocationId: string };

    await prismaPrimary.warehouseAllocation.delete({ where: { id: allocationId } });

    return reply.status(204).send();
  });

  // ============================================
  // FACILITIES (THEIR warehouses/buildings)
  // ============================================

  // List customer facilities
  fastify.get('/:id/facilities', async (request) => {
    const { id } = request.params as { id: string };

    const facilities = await prismaPrimary.customerFacility.findMany({
      where: { customerId: id },
    });

    return { facilities };
  });

  // Create customer facility
  fastify.post('/:id/facilities', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = customerFacilitySchema.parse(request.body);

    const facility = await prismaPrimary.customerFacility.create({
      data: {
        customerId: id,
        name: body.name,
        facilityType: body.facility_type || null,
        address: body.address as any,
        isSource: body.is_source || false,
        isDestination: body.is_destination || false,
        notes: body.notes || null,
      },
    });

    return reply.status(201).send({ facility });
  });

  // ============================================
  // CONTACTS
  // ============================================

  // List contacts
  fastify.get('/:id/contacts', async (request) => {
    const { id } = request.params as { id: string };

    const contacts = await prismaPrimary.contact.findMany({
      where: { customerId: id, active: true },
      orderBy: [{ isPrimary: 'desc' }, { lastName: 'asc' }],
    });

    return { contacts };
  });

  // Create contact
  fastify.post('/:id/contacts', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = contactSchema.parse(request.body);

    const contact = await prismaPrimary.contact.create({
      data: {
        customerId: id,
        firstName: body.first_name,
        lastName: body.last_name,
        title: body.title || null,
        email: body.email || null,
        phone: body.phone || null,
        role: body.role || null,
        isPrimary: body.is_primary || false,
        notes: body.notes || null,
      },
    });

    return reply.status(201).send({ contact });
  });

  // Update contact
  fastify.put('/:id/contacts/:contactId', async (request) => {
    const { contactId } = request.params as { id: string; contactId: string };
    const body = contactSchema.partial().parse(request.body);

    const contact = await prismaPrimary.contact.update({
      where: { id: contactId },
      data: {
        ...(body.first_name && { firstName: body.first_name }),
        ...(body.last_name && { lastName: body.last_name }),
        ...(body.title !== undefined && { title: body.title }),
        ...(body.email !== undefined && { email: body.email }),
        ...(body.phone !== undefined && { phone: body.phone }),
        ...(body.role !== undefined && { role: body.role }),
        ...(body.is_primary !== undefined && { isPrimary: body.is_primary }),
        ...(body.notes !== undefined && { notes: body.notes }),
      },
    });

    return { contact };
  });

  // Delete contact - Smart delete with lifecycle awareness
  fastify.delete('/:id/contacts/:contactId', async (request, reply) => {
    const { contactId } = request.params as { id: string; contactId: string };
    const { reason } = (request.body || {}) as { reason?: string };

    // Check if contact has evidentiary value
    const valueCheck = await checkEvidentaryValue('contact', contactId);

    if (valueCheck.hasValue) {
      // Contact has communication history - mark as inactive instead of delete
      await prismaPrimary.contact.update({
        where: { id: contactId },
        data: {
          active: false,  // Retire contact, don't delete
        }
      });
      
      return reply.send({ 
        message: 'Contact marked as inactive (has communication history)',
        action: 'deactivated'
      });
    }

    // No history - safe to soft-delete
    await prismaPrimary.contact.update({
      where: { id: contactId },
      data: {
        deleted: true,
        deletedAt: new Date(),
        deletedBy: (request as any).user?.id || null,
        deletedReason: reason || 'No communication history - safe to purge'
      }
    });

    return reply.status(204).send();
  });

  // ============================================
  // CONTRACTS
  // ============================================

  // List contracts
  fastify.get('/:id/contracts', async (request) => {
    const { id } = request.params as { id: string };

    const contracts = await prismaPrimary.contract.findMany({
      where: { customerId: id },
      include: {
        rateCards: {
          where: { isActive: true },
        },
      },
      orderBy: { startDate: 'desc' },
    });

    return { contracts };
  });

  // Create contract
  fastify.post('/:id/contracts', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = contractSchema.parse(request.body);

    const contract = await prismaPrimary.contract.create({
      data: {
        customerId: id,
        contractNumber: body.contract_number || null,
        name: body.name,
        startDate: new Date(body.start_date),
        endDate: body.end_date ? new Date(body.end_date) : null,
        autoRenew: body.auto_renew || false,
        status: body.status || 'draft',
        billingCycle: body.billing_cycle || null,
        paymentTerms: body.payment_terms || null,
        notes: body.notes || null,
      },
    });

    return reply.status(201).send({ contract });
  });

  // Archive contract
  fastify.post('/:customerId/contracts/:contractId/archive', async (request, reply) => {
    const { contractId } = request.params as { customerId: string; contractId: string };
    const { reason } = request.body as { reason: string };

    if (!reason || reason.trim().length < 10) {
      return reply.status(400).send({
        error: 'Archive reason required',
        message: 'Please provide a detailed reason for archival (minimum 10 characters)'
      });
    }

    const contract = await prismaPrimary.contract.findUnique({
      where: { id: contractId },
      select: { status: true, archivedAt: true }
    });

    if (!contract) {
      return reply.status(404).send({ error: 'Contract not found' });
    }

    if (contract.archivedAt) {
      return reply.status(400).send({
        error: 'Contract already archived',
        archivedAt: contract.archivedAt
      });
    }

    if (contract.status === 'active') {
      return reply.status(400).send({
        error: 'Cannot archive active contract',
        message: 'Terminate or expire the contract first',
        currentStatus: contract.status
      });
    }

    // Archive contract (never deleted - legal requirement)
    await prismaPrimary.contract.update({
      where: { id: contractId },
      data: {
        archivedAt: new Date(),
        archivedBy: (request as any).user?.id || 'system',
        archivedReason: reason.trim()
      }
    });

    return reply.send({ 
      message: 'Contract archived successfully',
      note: 'Contracts are never deleted, preserved forever for legal compliance'
    });
  });

  // ============================================
  // RATE CARDS
  // ============================================

  // List rate cards for a contract
  fastify.get('/:id/contracts/:contractId/rate-cards', async (request) => {
    const { contractId } = request.params as { id: string; contractId: string };

    const rateCards = await prismaPrimary.rateCard.findMany({
      where: { contractId },
      orderBy: { effectiveDate: 'desc' },
    });

    return { rateCards };
  });

  // Create rate card
  fastify.post('/:id/contracts/:contractId/rate-cards', async (request, reply) => {
    const { contractId } = request.params as { id: string; contractId: string };
    const body = rateCardSchema.parse(request.body);

    const rateCard = await prismaPrimary.rateCard.create({
      data: {
        contractId,
        name: body.name,
        effectiveDate: new Date(body.effective_date),
        expirationDate: body.expiration_date ? new Date(body.expiration_date) : null,
        version: body.version || 1,
        supersedesId: body.supersedes_id || null,
        rates: body.rates as any,
        isActive: body.is_active !== undefined ? body.is_active : true,
        notes: body.notes || null,
      },
    });

    return reply.status(201).send({ rateCard });
  });

  // ============================================
  // ONBOARDING (Single transaction)
  // ============================================
  
  fastify.post('/onboard', async (request, reply) => {
    const body = request.body as {
      client: { name: string; slug: string; status?: string };
      contact: { first_name: string; last_name: string; email?: string; phone?: string; title?: string };
      warehouse_allocations: Array<{
        company_warehouse_id: string;
        space_allocated?: { pallets?: number; sqft?: number };
        zone_assignment?: string;
        is_primary: boolean;
      }>;
      contract: { name: string; start_date: string; end_date?: string; billing_cycle?: string; payment_terms?: string };
    };

    try {
      // Use transaction to ensure all-or-nothing
      const result = await prismaPrimary.$transaction(async (tx) => {
        // 1. Create client
        const client = await tx.customer.create({
          data: {
            name: body.client.name,
            slug: body.client.slug,
            status: body.client.status || 'active',
            setupProgress: {},
          },
        });

        // 2. Create contact
        const contact = await tx.contact.create({
          data: {
            customerId: client.id,
            firstName: body.contact.first_name,
            lastName: body.contact.last_name,
            email: body.contact.email || null,
            phone: body.contact.phone || null,
            title: body.contact.title || null,
            role: 'general',
            isPrimary: true,
          },
        });

        // 3. Create warehouse allocations (with capacity check)
        const allocations: Array<{
          id: string;
          customerId: string;
          companyWarehouseId: string;
          isPrimary: boolean;
          spaceAllocated: any;
          zoneAssignment: string | null;
          status: string;
          createdAt: Date;
          updatedAt: Date;
        }> = [];
        
        for (const alloc of body.warehouse_allocations) {
          // Check capacity
          const warehouse = await tx.warehouse.findUnique({
            where: { id: alloc.company_warehouse_id },
            include: { warehouseAllocations: { select: { spaceAllocated: true } } }
          });

          if (!warehouse) {
            throw new Error(`Warehouse not found: ${alloc.company_warehouse_id}`);
          }

          const usedPallets = warehouse.warehouseAllocations.reduce((sum, a) => {
            return sum + ((a.spaceAllocated as any)?.pallets || 0);
          }, 0);

          const requestedPallets = alloc.space_allocated?.pallets || 0;
          const totalCapacity = (warehouse.capacity as any).usable_pallets || Infinity;
          const availablePallets = totalCapacity - usedPallets;

          if (requestedPallets > 0 && requestedPallets > availablePallets) {
            throw new Error(
              `Insufficient capacity at ${warehouse.code}: Requested ${requestedPallets} pallets, only ${availablePallets} available (${usedPallets}/${totalCapacity} used)`
            );
          }

          const allocation = await tx.warehouseAllocation.create({
            data: {
              customerId: client.id,
              companyWarehouseId: alloc.company_warehouse_id,
              isPrimary: alloc.is_primary,
              spaceAllocated: alloc.space_allocated || {},
              zoneAssignment: alloc.zone_assignment || null,
              status: 'active',
            },
          });

          allocations.push(allocation);
        }

        // 4. Create contract
        const contract = await tx.contract.create({
          data: {
            customerId: client.id,
            contractNumber: null,
            name: body.contract.name,
            startDate: new Date(body.contract.start_date),
            endDate: body.contract.end_date ? new Date(body.contract.end_date) : null,
            status: 'active',
            billingCycle: body.contract.billing_cycle || null,
            paymentTerms: body.contract.payment_terms || null,
          },
        });

        return { client, contact, allocations, contract };
      });

      return reply.status(201).send(result);
    } catch (error: any) {
      // Handle Prisma unique constraint errors
      if (error.code === 'P2002') {
        const field = error.meta?.target?.[0] || 'field';
        return reply.code(409).send({
          error: `A client with this ${field} already exists. Please use a different ${field}.`,
        });
      }
      
      // Handle capacity errors
      if (error.message?.includes('Insufficient capacity')) {
        return reply.code(400).send({ error: error.message });
      }

      throw error;
    }
  });
};


