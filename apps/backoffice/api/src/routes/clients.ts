import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prismaPrimary } from '../db';

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

  // List clients
  fastify.get('/', async (request) => {
    const { status } = request.query as { status?: string };
    
    const clients = await prismaPrimary.customer.findMany({
      where: status ? { status } : undefined,
      include: {
        _count: {
          select: {
            warehouseAllocations: true,
            facilities: true,
            contacts: true,
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

    const client = await prismaPrimary.customer.create({
      data: {
        name: body.name,
        slug: body.slug,
        status: body.status || 'prospect',
        setupProgress: {},
      },
    });

    return reply.status(201).send({ client });
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
    const totalCapacity = (warehouse.capacity as any).usable_pallets || 0;
    const availablePallets = totalCapacity - usedPallets;

    if (requestedPallets > availablePallets) {
      return reply.status(400).send({
        error: 'Insufficient warehouse capacity',
        details: `Requested ${requestedPallets} pallets, only ${availablePallets} available`,
        warehouseId: warehouse.id,
        warehouseCode: warehouse.code,
        totalCapacity,
        currentlyUsed: usedPallets,
        available: availablePallets
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

    // If updating space allocation, validate capacity
    if (body.space_allocated) {
      const allocation = await prismaPrimary.warehouseAllocation.findUnique({
        where: { id: allocationId },
        include: { warehouse: { include: { warehouseAllocations: true } } }
      });

      if (!allocation) {
        return reply.status(404).send({ error: 'Warehouse allocation not found' });
      }

      const currentAllocation = (allocation.spaceAllocated as any)?.pallets || 0;
      const newAllocation = body.space_allocated.pallets || 0;
      const difference = newAllocation - currentAllocation;

      if (difference > 0) {
        // Check if increase is possible
        const totalCapacity = (allocation.warehouse.capacity as any).usable_pallets || 0;
        const usedByOthers = allocation.warehouse.warehouseAllocations
          .filter(a => a.id !== allocationId)
          .reduce((sum, a) => sum + ((a.spaceAllocated as any)?.pallets || 0), 0);
        
        const available = totalCapacity - usedByOthers;
        
        if (newAllocation > available) {
          return reply.status(400).send({
            error: 'Insufficient warehouse capacity',
            details: `Requested ${newAllocation} pallets, only ${available} available`,
            totalCapacity,
            currentlyUsed: usedByOthers + currentAllocation,
            available
          });
        }
      }
    }

    const updated = await prismaPrimary.warehouseAllocation.update({
      where: { id: allocationId },
      data: {
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

  // Delete/deactivate contact
  fastify.delete('/:id/contacts/:contactId', async (request, reply) => {
    const { contactId } = request.params as { id: string; contactId: string };

    // Soft delete by marking as inactive
    await prismaPrimary.contact.update({
      where: { id: contactId },
      data: { active: false },
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
};


