import { SetMetadata } from '@nestjs/common';

export interface OwnerFieldOptions {
  field: string;
  source: 'body' | 'params' | 'query';
}

export const OwnerField = (field: string, source: OwnerFieldOptions['source'] = 'params') =>
  SetMetadata('ownerField', { field, source });
