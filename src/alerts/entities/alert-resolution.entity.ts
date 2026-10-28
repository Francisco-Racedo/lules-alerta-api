import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToOne, JoinColumn } from 'typeorm';
import { Alert } from './alert.entity.js';
import type { Relation } from 'typeorm';

@Entity('alert_resolutions')
export class AlertResolution {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // El JoinColumn va de este lado porque la resolución depende de que exista una alerta
  @OneToOne('Alert', 'resolution', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'alert_id' })
  alert: Relation<Alert>;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  imageUrl: string;

  @CreateDateColumn({ name: 'resolved_at' })
  resolvedAt: Date;
}