import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';
export enum DataLevel {
  PUBLICO = 'publico',
  INTERNO = 'interno',
  CONFIDENCIAL = 'confidencial',
  SECRETO = 'secreto',
}
@Entity()
export class DataItem {
  @PrimaryGeneratedColumn()
  id: number;
  @Column({ length: 120 })
  label: string;
  @Column({ type: 'enum', enum: DataLevel })
  correct_level: DataLevel;
  @Column({ length: 500 })
  explanation: string;
  @Column({ default: true })
  active: boolean;
}
