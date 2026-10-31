import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('avisos_v1')
export class Notice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 150 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  // Nivel de urgencia: 'CRITICAL' (Rojo), 'WARNING' (Naranja), 'INFO' (Azul)
  @Column({ type: 'varchar', length: 30, default: 'INFO' })
  severity: string;

  // Origen: 'OFICIAL' (Municipio/Defensa Civil) o 'VECINAL' (Alerta comunitaria verificada)
  @Column({ type: 'varchar', length: 30, default: 'OFICIAL' })
  sourceType: string;

  // Organismo emisor: Ej. "Defensa Civil Lules", "Tránsito Municipal", "Alerta Vecinal"
  @Column({ type: 'varchar', length: 100, default: 'Municipalidad de Lules' })
  issuer: string;

  // Barrio afectado: Ej. "Todo Lules", "Barrio Pilar", "Centro", etc.
  @Column({ type: 'varchar', length: 100, default: 'Todo Lules' })
  barrio: string;

  // Dirección legible en texto (ej: "Av. Ramón B. Ortega y 9 de Julio")
  @Column({ type: 'varchar', length: 255, nullable: true })
  address: string;

  // Coordenadas calculadas internamente (opcionales)
  @Column({ type: 'float', nullable: true })
  latitude: number;

  @Column({ type: 'float', nullable: true })
  longitude: number;

  // Teléfono de asistencia directa (opcional)
  @Column({ type: 'varchar', length: 30, nullable: true })
  contactPhone: string;

  @Column({ type: 'varchar', nullable: true })
  imageUrl: string;

  @Column({ type: 'jsonb', nullable: true })
  images: string[];

  @Column({ type: 'varchar', length: 20, default: 'ACTIVE' })
  status: string;

  @Column({ type: 'timestamptz', nullable: true })
  expiresAt: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}