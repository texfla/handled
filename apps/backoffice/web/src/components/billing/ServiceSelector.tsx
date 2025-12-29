import { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { ChevronDown, ChevronRight, Plus } from 'lucide-react';
import { useBillingServices } from '../../hooks/useBillingServices';
import type { BillingCategory, ServiceRate } from './types';

interface ServiceSelectorProps {
  selectedServices: ServiceRate[];
  onServiceAdd: (service: ServiceRate) => void;
  onServiceRemove: (serviceType: string) => void;
}

export function ServiceSelector({ selectedServices, onServiceAdd, onServiceRemove }: ServiceSelectorProps) {
  const { data: categories, isLoading } = useBillingServices();
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const toggleCategory = (categoryCode: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryCode)) {
      newExpanded.delete(categoryCode);
    } else {
      newExpanded.add(categoryCode);
    }
    setExpandedCategories(newExpanded);
  };

  const isServiceSelected = (serviceCode: string) => {
    return selectedServices.some(s => s.serviceType === serviceCode);
  };

  const handleServiceAdd = (category: BillingCategory, service: any) => {
    const newService: ServiceRate = {
      serviceType: service.code,
      description: service.description,
      unit: service.unit,
      baseRate: undefined, // Will be set by user
      tiers: []
    };
    onServiceAdd(newService);
  };

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading services...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Add Services</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {categories?.map(category => (
          <div key={category.code} className="border rounded">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start p-3"
              onClick={() => toggleCategory(category.code)}
            >
              {expandedCategories.has(category.code) ? (
                <ChevronDown className="h-4 w-4 mr-2" />
              ) : (
                <ChevronRight className="h-4 w-4 mr-2" />
              )}
              {category.name}
              <Badge variant="outline" className="ml-auto">
                {category.services.length}
              </Badge>
            </Button>

            {expandedCategories.has(category.code) && (
              <div className="px-3 pb-3 space-y-1">
                {category.services.map(service => (
                  <div key={service.code} className="flex items-center justify-between py-1">
                    <div className="flex-1">
                      <div className="font-medium text-sm">{service.name}</div>
                      <div className="text-xs text-muted-foreground">{service.description}</div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleServiceAdd(category, service)}
                      disabled={isServiceSelected(service.code)}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
