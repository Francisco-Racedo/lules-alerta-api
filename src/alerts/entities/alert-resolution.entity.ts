import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Alert } from './alert.entity.js';
import type { Relation } from 'typeorm';

@Entity('alert_resolutions')
export class AlertResolution {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne('Alert', 'resolution', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'alert_id' })
  alert: Relation<Alert>;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  imageUrl: string;

  @Column({
    type: 'text',
    array: true,
    nullable: true,
    name: 'images',
  })
  images: string[];

  @CreateDateColumn({ name: 'resolved_at' })
  resolvedAt: Date;
}