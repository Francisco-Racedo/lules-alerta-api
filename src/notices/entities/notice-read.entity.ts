import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity('notice_reads')
@Unique(['noticeId', 'userId'])
export class NoticeRead {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  noticeId: string;

  @Column({ type: 'uuid' })
  userId: string;

  @CreateDateColumn({ type: 'timestamptz' })
  readAt: Date;
}
