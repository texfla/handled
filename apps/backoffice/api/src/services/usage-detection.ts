import { prismaPrimary } from '../db/index.js';

export interface EvidentaryCheck {
  hasValue: boolean;
  reason: string;
  details?: Record<string, number>;
  suggestion?: string;
}

/**
 * Determines if an entity has evidentiary value (participated in real business)
 * According to three-tier lifecycle philosophy
 */
export async function checkEvidentaryValue(
  entity: 'customer' | 'warehouse' | 'contact' | 'facility' | 'user' | 'contract',
  entityId: string
): Promise<EvidentaryCheck> {
  
  switch (entity) {
    case 'customer':
      return checkCustomerValue(entityId);
    case 'warehouse':
      return checkWarehouseValue(entityId);
    case 'contact':
      return checkContactValue(entityId);
    case 'facility':
      return checkFacilityValue(entityId);
    case 'user':
      return checkUserValue(entityId);
    case 'contract':
      return checkContractValue(entityId);
  }
}

async function checkCustomerValue(customerId: string): Promise<EvidentaryCheck> {
  const customer = await prismaPrimary.customer.findUnique({
    where: { id: customerId },
    select: {
      isTestData: true,
      _count: {
        select: {
          warehouseAllocations: true,
          contracts: true,
          contactLog: true,
          facilities: true,
        }
      }
    }
  });

  if (!customer) {
    return { hasValue: false, reason: 'Customer not found' };
  }

  // Explicit test data flag
  if (customer.isTestData) {
    return { hasValue: false, reason: 'Marked as test data', details: customer._count };
  }

  // Any warehouse allocation = operational truth
  if (customer._count.warehouseAllocations > 0) {
    return { 
      hasValue: true, 
      reason: 'Has warehouse allocations (operational footprint)',
      details: customer._count
    };
  }

  // Any contract = legal/financial truth (even drafts have negotiation history)
  if (customer._count.contracts > 0) {
    return { 
      hasValue: true, 
      reason: 'Has contracts (legal evidence)',
      details: customer._count
    };
  }

  // Communication history = sales/relationship truth
  if (customer._count.contactLog > 0) {
    return { 
      hasValue: true, 
      reason: 'Has communication history (relationship evidence)',
      details: customer._count
    };
  }

  // Has facilities = planning truth (even if never shipped)
  if (customer._count.facilities > 0) {
    return { 
      hasValue: true, 
      reason: 'Has facilities configured (planning evidence)',
      details: customer._count
    };
  }

  return { 
    hasValue: false, 
    reason: 'No transactional footprint - safe to delete',
    details: customer._count
  };
}

async function checkWarehouseValue(warehouseId: string): Promise<EvidentaryCheck> {
  const warehouse = await prismaPrimary.warehouse.findUnique({
    where: { id: warehouseId },
    select: {
      _count: {
        select: {
          warehouseAllocations: true,  // ANY allocation, not just active
          zones: true,
        }
      }
    }
  });

  if (!warehouse) {
    return { hasValue: false, reason: 'Warehouse not found' };
  }

  // ANY allocation (active, inactive, terminated) = operational truth
  if (warehouse._count.warehouseAllocations > 0) {
    return { 
      hasValue: true, 
      reason: 'Has allocation history (operational evidence - must retire)',
      details: warehouse._count
    };
  }

  // Zones configured = planning truth (even if never allocated)
  if (warehouse._count.zones > 0) {
    return { 
      hasValue: true, 
      reason: 'Has zones configured (planning evidence)',
      details: warehouse._count
    };
  }

  return { 
    hasValue: false, 
    reason: 'No operational footprint - safe to delete',
    details: warehouse._count
  };
}

async function checkContactValue(contactId: string): Promise<EvidentaryCheck> {
  const contact = await prismaPrimary.contact.findUnique({
    where: { id: contactId },
    select: {
      customer: { select: { isTestData: true, deleted: true } },
      _count: {
        select: {
          contactLog: true,
        }
      }
    }
  });

  if (!contact) {
    return { hasValue: false, reason: 'Contact not found' };
  }

  // Belongs to deleted/test customer = safe to delete
  if (contact.customer.deleted || contact.customer.isTestData) {
    return { hasValue: false, reason: 'Belongs to test/deleted customer' };
  }

  // Has communication history = relationship evidence
  if (contact._count.contactLog > 0) {
    return { 
      hasValue: true, 
      reason: 'Has communication history',
      details: contact._count
    };
  }

  return { hasValue: false, reason: 'No communication history' };
}

async function checkFacilityValue(facilityId: string): Promise<EvidentaryCheck> {
  const facility = await prismaPrimary.customerFacility.findUnique({
    where: { id: facilityId },
    select: {
      customer: { select: { isTestData: true, deleted: true } },
    }
  });

  if (!facility) {
    return { hasValue: false, reason: 'Facility not found' };
  }

  // Belongs to test/deleted customer = safe to delete
  if (facility.customer.deleted || facility.customer.isTestData) {
    return { hasValue: false, reason: 'Belongs to test/deleted customer' };
  }

  // If parent customer is active/retired, facility has value
  return { 
    hasValue: true, 
    reason: 'Belongs to active/retired customer (preserve as history)'
  };
}

async function checkUserValue(userId: string): Promise<EvidentaryCheck> {
  const user = await prismaPrimary.user.findUnique({
    where: { id: userId },
    select: {
      disabled: true,
      _count: {
        select: {
          integrationRuns: true,
          managedWarehouses: true,
          contactLogs: true,
          sessions: true,  // Ever logged in?
          deletedCustomers: true,
          retiredCustomers: true,
          deletedWarehouses: true,
          retiredWarehouses: true,
        }
      }
    }
  });

  if (!user) {
    return { hasValue: false, reason: 'User not found' };
  }

  // Already disabled = was real user, cannot delete (only disable)
  if (user.disabled) {
    return { 
      hasValue: true, 
      reason: 'User is disabled (preserved for audit trail)',
      details: user._count
    };
  }

  // Check for ANY activity
  const totalActivity = Object.values(user._count).reduce((a, b) => a + b, 0);
  
  if (totalActivity > 0) {
    return { 
      hasValue: true, 
      reason: 'User has activity - must disable, not delete',
      details: user._count
    };
  }

  return { 
    hasValue: false, 
    reason: 'User never logged in, no activity - safe to delete',
    details: user._count
  };
}

async function checkContractValue(contractId: string): Promise<EvidentaryCheck> {
  const contract = await prismaPrimary.contract.findUnique({
    where: { id: contractId },
    select: {
      status: true,
      archivedAt: true,
    }
  });

  if (!contract) {
    return { hasValue: false, reason: 'Contract not found' };
  }

  // Contracts are NEVER deletable - they're legal documents
  // Can only be archived if expired/terminated
  if (contract.status === 'active') {
    return { 
      hasValue: true, 
      reason: 'Active contract - cannot delete or archive (legal document)'
    };
  }

  if (contract.archivedAt) {
    return { 
      hasValue: true, 
      reason: 'Contract already archived (preserved forever)'
    };
  }

  // Expired/terminated but not archived - can be archived
  return { 
    hasValue: true, 
    reason: 'Contract can be archived (not deleted - legal requirement)',
    suggestion: 'archive'  // Special case: don't delete, archive instead
  };
}

