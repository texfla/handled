import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prismaPrimary } from '../db';
import { checkEvidentaryValue } from '../services/usage-detection.js';

const warehouseSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(['owned', 'leased', 'partner']),
  status: z.enum(['active', 'commissioning', 'offline', 'decommissioned', 'retired']).default('active'),
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
  fastify.get('/', async () => {
    const warehouses = await prismaPrimary.warehouse.findMany({
      where: {
        deleted: false,  // Exclude soft-deleted
      },
      include: {
        manager: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: { warehouseAllocations: true },
        },
        warehouseAllocations: {
          select: {
            spaceAllocated: true,
          },
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
        warehouseAllocations: {
          include: {
            customer: {
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
        operatingHours: body.operating_hours || undefined,
        capabilities: body.capabilities || [],
        managerId: body.manager_id || null,
        notes: body.notes || null,
      },
    });

    return reply.status(201).send({ warehouse });
  });

  // Update warehouse
  fastify.put('/:id', async (request) => {
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

  // Delete warehouse - Smart delete with lifecycle awareness
  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { reason } = (request.body || {}) as { reason?: string };

    // Check if warehouse has evidentiary value
    const valueCheck = await checkEvidentaryValue('warehouse', id);

    if (valueCheck.hasValue) {
      return reply.status(409).send({
        error: 'Cannot delete warehouse with history',
        reason: valueCheck.reason,
        details: valueCheck.details,
        suggestion: {
          action: 'retire',
          message: 'This warehouse has been used in operations. Please retire it instead.',
          endpoint: `PATCH /api/warehouses/${id}`,
          payload: { 
            status: 'retired',
            retiredReason: reason || 'Warehouse no longer in use'
          }
        }
      });
    }

    // Safe to soft-delete
    await prismaPrimary.warehouse.update({
      where: { id },
      data: {
        deleted: true,
        deletedAt: new Date(),
        deletedBy: (request as any).user?.id || null,
        deletedReason: reason || 'Never used - safe to purge'
      }
    });

    return reply.status(204).send();
  });

  // Retire warehouse - Preserve forever
  fastify.post('/:id/retire', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { reason } = request.body as { reason: string };

    if (!reason || reason.trim().length < 10) {
      return reply.status(400).send({
        error: 'Retirement reason required',
        message: 'Please provide a detailed reason for retirement (minimum 10 characters)'
      });
    }

    const warehouse =     await prismaPrimary.warehouse.update({
      where: { id },
      data: {
        status: 'retired',
        retiredAt: new Date(),
        retiredBy: (request as any).user?.id || null,
        retiredReason: reason.trim()
      }
    });

    return reply.send({ 
      message: 'Warehouse retired successfully',
      warehouse 
    });
  });
};


