import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Trip } from './trip.entity';
import { Activity } from './activity.entity';

@Entity('days')
export class Day {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  tripId: number;

  @Column({ type: 'date' })
  date: Date;

  @Column()
  title: string;

  @Column()
  order: number;

  @ManyToOne(() => Trip, trip => trip.days, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tripId' })
  trip: Trip;

  @OneToMany(() => Activity, activity => activity.day, { cascade: true })
  activities: Activity[];
}
