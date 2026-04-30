import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Benefits {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  title: string;

  @Column({ length: 100 })
  description: string;

  @Column({ length: 255 })
  color: string;

  @Column({ length: 100 })
  textColor: string

  @Column({length: 100})
  borderColor: string

  @Column({default: true})
  glow: boolean;

}
