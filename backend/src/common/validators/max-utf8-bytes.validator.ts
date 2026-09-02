import {
  ValidationArguments,
  ValidationOptions,
  registerDecorator,
} from 'class-validator';

export function MaxUtf8Bytes(
  maxBytes: number,
  validationOptions?: ValidationOptions,
) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'maxUtf8Bytes',
      target: object.constructor,
      propertyName,
      constraints: [maxBytes],
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          return (
            typeof value === 'string' &&
            Buffer.byteLength(value, 'utf8') <= maxBytes
          );
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} deve ter no máximo ${maxBytes} bytes em UTF-8.`;
        },
      },
    });
  };
}
