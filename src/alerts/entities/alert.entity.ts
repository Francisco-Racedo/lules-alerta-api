import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  CreateDateColumn, 
  ManyToOne, 
  JoinColumn 
} from 'typeorm';
import { User } from '../../users/entities/user.entity.js';

@Entity('alerts') // Mapea con la tabla 'alerts' de PostgreSQL/PostGIS
export class Alert {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'varchar', length: 50, default: 'PENDING' })
  status: string;

  // NUEVO: Dirección legible para humanos (opcional)
  @Column({ type: 'varchar', nullable: true })
  address: string;

  // NUEVO: Enlace a la fotografía almacenada en la nube (opcional)
  @Column({ type: 'varchar', nullable: true, name: 'image_url' })
  imageUrl: string;

  /*
   * COLUMNA GEOESPACIAL:
   * Almacena las coordenadas geográficas (Latitud y Longitud) utilizando PostGIS.
   * El tipo geometry con Point y SRID 4326 es el estándar GPS mundial.
   */
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

  // Relación N a 1: Muchas alertas pueden pertenecer a un usuario
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}