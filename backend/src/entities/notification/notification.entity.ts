import { Column, Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from "typeorm";
import { Usuario } from "../usuarios/usuario.entity";


@Entity()
export class Notification{

    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => Usuario)
    @JoinColumn({name: 'usuario_id'})
    usuario: Usuario;

    @Column()
    usuario_id: number

    @Column({length: 100})
    title: string

    @Column({length: 250})
    message: string

    @Column({length: 100})
    type: string

    @Column({default: false})
    readed: boolean

    @Column({ default: () => 'CURRENT_TIMESTAMP' })
    created_at: Date
}