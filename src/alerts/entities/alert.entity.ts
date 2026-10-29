import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  CreateDateColumn, 
  ManyToOne, 
  JoinColumn,
  OneToMany,
  OneToOne
} from 'typeorm';
import type { Relation } from 'typeorm';
import { User } from '../../users/entities/user.entity.js';
import { AlertHistory } from './alert-history.entity.js';
import { AlertResolution } from './alert-resolution.entity.js';

@Entity('alertas') // Mapea con la tabla 'alertas' de PostgreSQL/PostGIS
export class Alert {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  category: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'varchar', length: 50, default: 'PENDING' })
  status: string;

  @Column({ type: 'varchar', nullable: true })
  address: string;

  // Columna original: Se mantiene por retrocompatibilidad con reportes antiguos
  @Column({ type: 'varchar', nullable: true, name: 'image_url' })
  imageUrl: string;

  // NUEVA COLUMNA: Arreglo nativo de PostgreSQL para soportar el carrusel
  @Column({ type: 'text', array: true, nullable: true, name: 'images' })
  images: string[];

  @Column({
    type: 'geometry',
    spatialFeatureType: 'Point',
    srid: 4326,
    name: 'location',
  })
  location: {
    type: 'Point';
    coordinates: [number, number]; // [Longitud, Latitud]
  };

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ type: 'boolean', default: false, name: 'is_archived' })
  isArchived: boolean;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: Relation<User>;

  @OneToMany(() => AlertHistory, history => history.alert, { cascade: true })
  history: Relation<AlertHistory>[];

  @OneToOne('AlertResolution', 'alert', { cascade: true })
  resolution: Relation<AlertResolution>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}