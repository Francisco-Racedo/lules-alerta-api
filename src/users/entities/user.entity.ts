import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('usuarios')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'nombre', type: 'varchar', length: 100 })
  nombre: string;

  // El DNI debe ser único para evitar cuentas duplicadas
  @Column({ name: 'dni', type: 'varchar', length: 10, unique: true })
  dni: string;

  @Column({ name: 'telefono', type: 'varchar', length: 20 })
  telefono: string;

  @Column({ name: 'password', type: 'varchar', length: 255 })
  password: string;

  // Conservamos tus excelentes métricas de seguridad y baneos de la Fase 1
  @Column({ name: 'trust_score', type: 'int', default: 50 })
  trustScore: number;

  @Column({ name: 'is_banned', type: 'boolean', default: false })
  isBanned: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}