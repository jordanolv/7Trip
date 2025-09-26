import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { User } from '../../../users/domain/entities/user.entity';
import { TripMember, TripMemberRole } from './trip-member.entity';
import { Day } from './day.entity';

export enum TripStatus {
  DRAFT = 'draft',
  PLANNED = 'planned',
  ONGOING = 'ongoing',
  COMPLETED = 'completed',
}

@Entity('trips')
export class Trip {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'date' })
  startDate: Date;

  @Column({ type: 'date' })
  endDate: Date;

  @Column()
  createdBy: number;

  @Column({ default: false })
  isPublic: boolean;

  @Column({ nullable: true })
  coverImage: string;

  @Column({
    type: 'enum',
    enum: TripStatus,
    default: TripStatus.DRAFT,
  })
  status: TripStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => TripMember, tripMember => tripMember.trip, { cascade: true })
  members: TripMember[];

  get creator(): User | undefined {
    return this.members?.find(m => m.role === TripMemberRole.OWNER)?.user;
  }

  @OneToMany(() => Day, day => day.trip, { cascade: true })
  days: Day[];
}
