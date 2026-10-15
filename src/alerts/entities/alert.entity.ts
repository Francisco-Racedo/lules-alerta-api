import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  CreateDateColumn, 
  ManyToOne, 
  JoinColumn 
} from 'typeorm';
import { User } from '../../users/entities/user.entity.js';

@Entity('alertas') // Mapea con la tabla 'alertas' de PostgreSQL/PostGIS
export class Alert {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // CORRECCIÓN CRÍTICA: Agregamos la categoría para saber el tipo de emergencia
  @Column({ type: 'varchar', length: 100 })
  category: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'varchar', length: 50, default: 'PENDING' })
  status: string;

  @Column({ type: 'varchar', nullable: true })
  address: string;

  @Column({ type: 'varchar', nullable: true, name: 'image_url' })
  imageUrl: string;

  /*
   * COLUMNA GEOESPACIAL:
   * Almacena las coordenadas. Recordatorio para el servicio: 
   * PostGIS usa el formato [Longitud, Latitud].
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

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}