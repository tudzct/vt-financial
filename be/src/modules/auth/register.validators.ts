import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

const COMMON_PASSWORDS = new Set([
  'password1!',
  'password123!',
  'qwerty123!',
  'admin123!',
  'welcome1!',
  'letmein1!',
]);

export const IsNotCommonPassword =
  (validationOptions?: ValidationOptions): PropertyDecorator =>
  (target: object, propertyKey: string | symbol): void => {
    registerDecorator({
      name: 'isNotCommonPassword',
      target: target.constructor,
      propertyName: propertyKey.toString(),
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          return (
            typeof value === 'string' &&
            !COMMON_PASSWORDS.has(value.toLocaleLowerCase('en-US'))
          );
        },
      },
    });
  };

export const MatchesProperty =
  (
    property: string,
    validationOptions?: ValidationOptions,
  ): PropertyDecorator =>
  (target: object, propertyKey: string | symbol): void => {
    registerDecorator({
      name: 'matchesProperty',
      target: target.constructor,
      propertyName: propertyKey.toString(),
      constraints: [property],
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments): boolean {
          const [relatedProperty] = args.constraints as [string];
          const object = args.object as Record<string, unknown>;
          return typeof value === 'string' && value === object[relatedProperty];
        },
      },
    });
  };
