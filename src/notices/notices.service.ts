import { BadRequestException, Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notice } from './entities/notice.entity.js';
import { CreateNoticeDto } from './dto/create-notice.dto.js';

@Injectable()
export class NoticesService implements OnModuleInit {
  constructor(
    @InjectRepository(Notice)
    private readonly noticeRepository: Repository<Notice>,
  ) {}

  // Se ejecuta automáticamente al encender el servidor: si la tabla está vacía, crea avisos de prueba para Lules
  async onModuleInit() {
    const count = await this.noticeRepository.count();
    if (count === 0) {
      await this.seedInitialNotices();
    }
  }

  // MOTOR DE GEOCODIFICACIÓN INVISIBLE: Convierte nombres de calles de Lules en coordenadas [Lat, Lng]
  private async geocodeAddressInLules(
    addressText: string,
  ): Promise<{ lat: number; lng: number; displayName: string } | null> {
    try {
      const fullQuery = `${addressText}, San Isidro de Lules, Tucumán, Argentina`;
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullQuery)}&countrycodes=ar&limit=5`;

      const response = await fetch(url, {
        headers: { 'User-Agent': 'LulesAlertaApp/1.0' },
      });

      if (!response.ok) return null;
      const data: Array<{ lat: string; lon: string; display_name?: string }> =
        await response.json();

      if (Array.isArray(data) && data.length > 0) {
        const result = data.find((item) =>
          item.display_name?.toLowerCase().includes('lules'),
        ) ?? data[0];
        const lat = parseFloat(result.lat);
        const lng = parseFloat(result.lon);

        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
          return null;
        }

        return {
          lat,
          lng,
          displayName: result.display_name ?? addressText,
        };
      }
      return null;
    } catch (error) {
      console.warn('No se pudo geocodificar la dirección automáticamente:', error);
      return null;
    }
  }

  async create(createNoticeDto: CreateNoticeDto): Promise<Notice> {
    let { latitude, longitude, address, barrio } = createNoticeDto;

    if (address) {
      const coords = await this.geocodeAddressInLules(address);
      if (coords) {
        latitude = coords.lat;
        longitude = coords.lng;
        address = coords.displayName;
      } else if (latitude === undefined || longitude === undefined) {
        throw new BadRequestException(
          'No se pudo localizar la dirección del aviso en San Isidro de Lules.',
        );
      }
    }

    const hasPartialCoordinates =
      (latitude === undefined) !== (longitude === undefined);
    const hasInvalidCoordinates =
      latitude !== undefined &&
      longitude !== undefined &&
      (!Number.isFinite(latitude) ||
        !Number.isFinite(longitude) ||
        latitude < -90 ||
        latitude > 90 ||
        longitude < -180 ||
        longitude > 180);

    if (hasPartialCoordinates || hasInvalidCoordinates) {
      throw new BadRequestException(
        'La ubicación del aviso debe tener latitud y longitud válidas.',
      );
    }

    const newNotice = this.noticeRepository.create({
      ...createNoticeDto,
      barrio: barrio ? barrio.trim() : 'Todo Lules',
      latitude,
      longitude,
    });

    return await this.noticeRepository.save(newNotice);
  }

  async findAll(barrio?: string, sourceType?: string): Promise<Notice[]> {
    const query = this.noticeRepository.createQueryBuilder('notice');

    // Si filtra por un barrio específico (que no sea "Todo Lules"), muestra los de ese barrio + los avisos generales de "Todo Lules"
    if (barrio && barrio !== 'Todo Lules') {
      query.andWhere('(LOWER(notice.barrio) = LOWER(:barrio) OR notice.barrio = :global)', {
        barrio: barrio.trim(),
        global: 'Todo Lules',
      });
    }

    if (sourceType && sourceType !== 'TODOS') {
      query.andWhere('notice.sourceType = :sourceType', { sourceType });
    }

    // Ordenamos: Primero los CRITICAL, luego por fecha más reciente
    query
      .orderBy("CASE WHEN notice.severity = 'CRITICAL' THEN 1 WHEN notice.severity = 'WARNING' THEN 2 ELSE 3 END", 'ASC')
      .addOrderBy('notice.createdAt', 'DESC');

    return await query.getMany();
  }

  private async seedInitialNotices() {
    const sampleNotices: CreateNoticeDto[] = [
      {
        title: 'Alerta Meteorológica: Tormentas Fuertes',
        description: 'Se prevén lluvias intensas y ráfagas de viento para esta noche en toda la jurisdicción de Lules. Evite sacar residuos y asegure objetos en balcones o patios.',
        severity: 'CRITICAL',
        sourceType: 'OFICIAL',
        issuer: 'Defensa Civil Lules',
        barrio: 'Todo Lules',
        contactPhone: '103',
      },
      {
        title: 'Trabajos de poda y despeje de luminarias',
        description: 'Cuadrillas municipales estarán trabajando sobre Av. Ramón B. Ortega. Circular con precaución por reducción de calzada.',
        severity: 'WARNING',
        sourceType: 'OFICIAL',
        issuer: 'Obras y Servicios Públicos',
        barrio: 'Barrio Pilar',
        address: 'Av. Ramón B. Ortega 1048',
        latitude: -26.9358136,
        longitude: -65.3287963,
      },
      {
        title: 'Precaución: Semáforo en intermitente',
        description: 'Vecinos reportan desperfecto eléctrico en el cruce céntrico. Personal de Tránsito ya fue notificado y se dirige al lugar.',
        severity: 'WARNING',
        sourceType: 'VECINAL',
        issuer: 'Alerta Vecinal Verificada',
        barrio: 'Centro',
        address: 'Av. San Martín y 9 de Julio',
        latitude: -26.9254, // Coordenadas ajustadas al cruce real
        longitude: -65.3378,
      },
      {
        title: 'Operativo Móvil de Vacunación y Zoonosis',
        description: 'Mañana de 09:00 a 13:00 hs se realizará vacunación antirrábica gratuita y control sanitario en la plaza principal.',
        severity: 'INFO',
        sourceType: 'OFICIAL',
        issuer: 'Secretaría de Salud',
        barrio: 'La Reducción',
        address: 'Plaza Principal La Reducción',
        latitude: -26.9535,
        longitude: -65.3268,
      },
    ];

    for (const item of sampleNotices) {
      await this.create(item);
    }
    console.log('✅ [Notices] 4 avisos iniciales de Lules cargados automáticamente.');
  }
}