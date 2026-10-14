import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('usuarios')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  nombre: string;

  @Column({ type: 'varchar', length: 8, unique: true, nullable: true })
  dni: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  telefono: string;

  @Column({ type: 'varchar', nullable: true })
  password: string;

  @Column({ type: 'varchar', length: 150, nullable: true, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  direccion: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  barrio: string;

  @Column({ type: 'varchar', nullable: true })
  fotoPerfil: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  contactoEmergenciaNombre: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  contactoEmergenciaTelefono: string;

  @Column({ type: 'text', nullable: true })
  datosMedicos: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}