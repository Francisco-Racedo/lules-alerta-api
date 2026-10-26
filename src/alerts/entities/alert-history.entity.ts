import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import type { Relation } from 'typeorm';
import { Alert } from './alert.entity.js';

@Entity('alert_history')
export class AlertHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Alert, alert => alert.history, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'alert_id' })
  alert: Relation<Alert>;

  @Column({ type: 'varchar', length: 50, nullable: true })
  previousStatus: string;

  @Column({ type: 'varchar', length: 50 })
  newStatus: string;

  @Column({ type: 'text', nullable: true })
  comment: string;

  @CreateDateColumn()
  changedAt: Date;
}