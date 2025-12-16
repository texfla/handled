import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prismaPrimary } from '../db';

const warehouseSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(['owned', 'leased', 'partner']),
  status: z.enum(['active', 'commissioning', 'offline', 'decommissioned']).default('active'),
  address: z.object({
    street1: z.string(),
    street2: z.string().optional(),
    city: z.string(),
    state: z.string(),
    zip: z.string(),
    country: z.string(),
    timezone: z.string().optional(),
  }),
  timezone: z.string().default('America/Chicago'),
  capacity: z.object({
    total_sqft: z.number().optional(),
    usable_sqft: z.number().optional(),
    usable_pallets: z.number().optional(),
  }).optional(),
  operating_hours: z.record(z.string()).optional(),
  capabilities: z.array(z.string()).optional(),
  manager_id: z.string().optional(),
  notes: z.string().optional(),
});

export const warehousesRoutes: FastifyPluginAsync = async (fastify) => {
  // List warehouses
  fastify.get('/', async (request, reply) => {
    const warehouses = await prismaPrimary.warehouse.findMany({
      include: {
        manager: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: { facilities: true },
        },
      },
      orderBy: { code: 'asc' },
    });
    
    return { warehouses };
  });

  // Get warehouse by ID
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    
    const warehouse = await prismaPrimary.warehouse.findUnique({
      where: { id },
      include: {
        manager: {
          select: { id: true, name: true, email: true },
        },
        facilities: {
          include: {
            organization: {
              select: { id: true, name: true, slug: true },
            },
          },
        },
        zones: true,
      },
    });

    if (!warehouse) {
      return reply.status(404).send({ error: 'Warehouse not found' });
    }

    return { warehouse };
  });

  // Create warehouse
  fastify.post('/', async (request, reply) => {
    const body = warehouseSchema.parse(request.body);
    
    const warehouse = await prismaPrimary.warehouse.create({
      data: {
        code: body.code,
        name: body.name,
        type: body.type,
        status: body.status,
        address: body.address as any,
        timezone: body.timezone,
        capacity: body.capacity || {},
        operatingHours: body.operating_hours || null,
        capabilities: body.capabilities || [],
        managerId: body.manager_id || null,
        notes: body.notes || null,
      },
    });

    return reply.status(201).send({ warehouse });
  });

  // Update warehouse
  fastify.put('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = warehouseSchema.partial().parse(request.body);

    const warehouse = await prismaPrimary.warehouse.update({
      where: { id },
      data: {
        ...(body.code && { code: body.code }),
        ...(body.name && { name: body.name }),
        ...(body.type && { type: body.type }),
        ...(body.status && { status: body.status }),
        ...(body.address && { address: body.address as any }),
        ...(body.timezone && { timezone: body.timezone }),
        ...(body.capacity && { capacity: body.capacity }),
        ...(body.operating_hours !== undefined && { operatingHours: body.operating_hours }),
        ...(body.capabilities && { capabilities: body.capabilities }),
        ...(body.manager_id !== undefined && { managerId: body.manager_id }),
        ...(body.notes !== undefined && { notes: body.notes }),
      },
    });

    return { warehouse };
  });

  // Delete warehouse
  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    // Check if warehouse has active client facilities
    const facilitiesCount = await prismaPrimary.facility.count({
      where: { companyWarehouseId: id, status: 'active' },
    });

    if (facilitiesCount > 0) {
      return reply.status(400).send({
        error: 'Cannot delete warehouse with active client facilities',
        details: `${facilitiesCount} active facilities exist`,
      });
    }

    await prismaPrimary.warehouse.delete({ where: { id } });

    return reply.status(204).send();
  });
};
