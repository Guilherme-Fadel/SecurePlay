import { IsEmail, IsString, MinLength } from 'class-validator';
import { Column } from 'typeorm/browser/decorator/columns/Column.js';

export class UsuarioCadastrarDto {
  @IsString()
  name: string;

  @Column({ unique: true })
  email: string;

  @MinLength(6)
  password: string;
}