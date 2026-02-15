import type { z } from 'zod';
import type { SchemaFieldInfo } from './types';

function getInnerType(schema: z.ZodTypeAny): { inner: z.ZodTypeAny; required: boolean; defaultValue?: unknown } {
  const def = (schema as any)._def;
  if (def.typeName === 'ZodOptional') {
    const r = getInnerType(def.innerType);
    return { ...r, required: false };
  }
  if (def.typeName === 'ZodDefault') {
    const r = getInnerType(def.innerType);
    return { ...r, required: false, defaultValue: def.defaultValue() };
  }
  if (def.typeName === 'ZodNullable') {
    const r = getInnerType(def.innerType);
    return { ...r, required: false };
  }
  return { inner: schema, required: true };
}

function schemaToType(schema: z.ZodTypeAny): SchemaFieldInfo['type'] {
  const tn = (schema as any)._def.typeName as string;
  switch (tn) {
    case 'ZodString': return 'string';
    case 'ZodNumber': return 'number';
    case 'ZodBoolean': return 'boolean';
    case 'ZodEnum': case 'ZodNativeEnum': return 'enum';
    case 'ZodArray': return 'array';
    case 'ZodObject': return 'object';
    default: return 'unknown';
  }
}

function introspectField(name: string, schema: z.ZodTypeAny): SchemaFieldInfo {
  const { inner, required, defaultValue } = getInnerType(schema);
  const def = (inner as any)._def;
  const type = schemaToType(inner);

  const field: SchemaFieldInfo = {
    name,
    type,
    required,
    description: schema.description ?? (inner as any).description,
    defaultValue,
  };

  if (type === 'enum' && def.values) {
    field.enumValues = def.values;
  }
  if (type === 'object' && def.shape) {
    field.children = introspectSchema(inner as z.ZodObject<any>);
  }
  if (type === 'array' && def.type) {
    const itemType = schemaToType(def.type);
    if (itemType === 'object') {
      field.children = introspectSchema(def.type);
    }
  }

  return field;
}

export function introspectSchema(schema: z.ZodTypeAny): SchemaFieldInfo[] {
  const def = (schema as any)._def;
  if (def.typeName !== 'ZodObject' || !def.shape) return [];
  const shape = typeof def.shape === 'function' ? def.shape() : def.shape;
  return Object.entries(shape).map(([name, fieldSchema]) =>
    introspectField(name, fieldSchema as z.ZodTypeAny)
  );
}

export const ZodSchemaIntrospector = { introspectSchema, introspectField };
