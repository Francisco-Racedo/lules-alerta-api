import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('users') // Conecta explícitamente con la tabla 'users' de PostgreSQL
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'device_id', type: 'varchar', length: 255, unique: true })
  deviceId: string;

  // nullable: true porque en la Fase 1 permitimos usuarios anónimos
  @Column({ name: 'phone_number', type: 'varchar', length: 20, unique: true, nullable: true })
  phoneNumber: string | null;

  @Column({ name: 'trust_score', type: 'int', default: 50 })
  trustScore: number;

  @Column({ name: 'is_banned', type: 'boolean', default: false })
  isBanned: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}