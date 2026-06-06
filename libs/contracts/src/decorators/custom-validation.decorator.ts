import { registerDecorator, ValidationOptions } from 'class-validator';

// Validate classic Prisma/PostgreSQL CUID: 25-char lowercase alphanumeric string starting with 'c'
const CUID_REGEX = /^c[a-z0-9]{24}$/;

/**
 * Class-validator decorator to validate Prisma/PostgreSQL CUID strings.
 */
export function IsCuid(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'IsCuid',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          return typeof value === 'string' && CUID_REGEX.test(value.trim());
        },
        defaultMessage(): string {
          return 'Value must be a valid CUID';
        },
      },
    });
  };
}

/**
 * Class-validator decorator to ensure startTime is strictly before endTime.
 */
export function IsNoOverlap(
  property: string,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'IsNoOverlap',
      target: object.constructor,
      propertyName,
      constraints: [property],
      options: validationOptions,
      validator: {
        validate(value: unknown, args: any): boolean {
          const [relatedPropertyName] = args.constraints;
          const relatedValue = args.object[relatedPropertyName];
          // Skip validation if related value is not provided (e.g. partial updates)
          if (relatedValue === undefined || relatedValue === null) {
            return true;
          }
          if (typeof value === 'string' && typeof relatedValue === 'string') {
            return value < relatedValue; // simple string comparison for "HH:mm" works perfectly
          }
          return false;
        },
        defaultMessage(args: any): string {
          const [relatedPropertyName] = args.constraints;
          return `${propertyName} must be strictly before ${relatedPropertyName}`;
        },
      },
    });
  };
}
