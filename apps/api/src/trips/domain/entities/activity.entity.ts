import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Day } from './day.entity';
import { Category } from './category.entity';

@Entity('activities')
export class Activity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  dayId: number;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ nullable: true })
  address: string;

  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  latitude: number;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  longitude: number;

  @Column({ type: 'time', nullable: true })
  startTime: string;

  @Column({ type: 'time', nullable: true })
  endTime: string;

  @Column()
  categoryId: number;

  @Column()
  order: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  cost: number;

  @Column({ nullable: true })
  bookingUrl: string;

  @ManyToOne(() => Day, day => day.activities, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'dayId' })
  day: Day;

  @ManyToOne(() => Category, category => category.activities, { eager: true })
  @JoinColumn({ name: 'categoryId' })
  category: Category;
}
