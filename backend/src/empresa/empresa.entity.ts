import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity()
export class Empresa {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  nome: string;

  @Column({ length: 500, nullable: true })
  logo_url: string;

  @Column({ type: 'json', nullable: true })
  paleta: {
    primary: string;
    secondary: string;
    accent: string;
    text_primary: string;
    text_secondary: string;
  } | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
